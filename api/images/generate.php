<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/openai_images.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { json_response(['error' => 'Method not allowed'], 405); }

$payload = require_auth();
$input = !empty($_POST) ? $_POST : (json_decode(file_get_contents('php://input'), true) ?: []);

$prompt = $input['prompt'] ?? '';
$format = $input['format'] ?? '1:1';
$render_quality = $input['render_quality'] ?? 'standard';
$reference_image_url = $input['reference_image_url'] ?? '';
if (empty($prompt)) { json_response(['error' => 'Prompt required'], 400); }

$image_options = [
    '1:1' => [
        'api_size' => '1024x1024',
        'standard' => ['width' => 1024, 'height' => 1024, 'cost' => 4],
        'hires' => ['width' => 2048, 'height' => 2048, 'cost' => 16],
    ],
    '3:2' => [
        'api_size' => '1536x1024',
        'standard' => ['width' => 1536, 'height' => 1024, 'cost' => 6],
        'hires' => ['width' => 3072, 'height' => 2048, 'cost' => 24],
    ],
    '2:3' => [
        'api_size' => '1024x1536',
        'standard' => ['width' => 1024, 'height' => 1536, 'cost' => 6],
        'hires' => ['width' => 2048, 'height' => 3072, 'cost' => 24],
    ],
    '16:9' => [
        'api_size' => '1536x1024',
        'standard' => ['width' => 1792, 'height' => 1008, 'cost' => 7],
        'hires' => ['width' => 3584, 'height' => 2016, 'cost' => 28],
    ],
    '9:16' => [
        'api_size' => '1024x1536',
        'standard' => ['width' => 1008, 'height' => 1792, 'cost' => 7],
        'hires' => ['width' => 2016, 'height' => 3584, 'cost' => 28],
    ],
];
if (!isset($image_options[$format]) || !in_array($render_quality, ['standard', 'hires'], true)) {
    json_response(['error' => 'Invalid image format or resolution'], 400);
}

$option = $image_options[$format];
$output = $option[$render_quality];
$cost = $output['cost'];
$resolution = $output['width'] . 'x' . $output['height'];
$user = get_authenticated_user();
if (!$user || $user['credits'] < $cost) { json_response(['error' => 'Insufficient credits'], 400); }

try {
    $quality = 'medium';
    $image_data = $reference_image_url !== ''
        ? openai_edit_image(local_image_path($reference_image_url), $prompt, $option['api_size'])
        : openai_generate_image($prompt, $quality, $option['api_size']);
    if ($resolution !== $option['api_size']) {
        $image_data = render_image_dimensions($image_data, $output['width'], $output['height']);
    }
    $image_url = save_image_bytes($image_data, 'img_');
} catch (RuntimeException $e) {
    json_response(['error' => $e->getMessage()], 502);
}

// Save to DB and deduct credits
global $pdo;
try {
    $pdo->beginTransaction();
    $upd = $pdo->prepare('UPDATE users SET credits = credits - ? WHERE id = ? AND credits >= ?');
    $upd->execute([$cost, $user['id'], $cost]);
    if ($upd->rowCount() !== 1) {
        throw new RuntimeException('Insufficient credits');
    }
    $stmt = $pdo->prepare('INSERT INTO generated_images (user_id, user_email, image_url, prompt, resolution) VALUES (?, ?, ?, ?, ?)');
    $stmt->execute([$user['id'], $user['email'], $image_url, $prompt, $resolution]);
    $img_id = $pdo->lastInsertId();
    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    json_response(['error' => $e->getMessage()], 500);
}

json_response([
    'ok' => true,
    'image' => [
        'id' => $img_id,
        'url' => $image_url,
        'prompt' => $prompt,
        'format' => $format,
        'resolution' => $resolution,
    ],
    'credits_used' => $cost,
    'credits_remaining' => $user['credits'] - $cost
]);
