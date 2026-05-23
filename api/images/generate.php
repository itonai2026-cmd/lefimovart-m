<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/openai_images.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { json_response(['error' => 'Method not allowed'], 405); }

$payload = require_auth();
$input = json_decode(file_get_contents('php://input'), true);

$prompt = $input['prompt'] ?? '';
$resolution = $input['resolution'] ?? '1024';
$reference_image_url = $input['reference_image_url'] ?? '';
if (empty($prompt)) { json_response(['error' => 'Prompt required'], 400); }

// Cost calculation
$cost_map = ['512' => 2, '1024' => 4];
$cost = $cost_map[$resolution] ?? 4;
$user = get_authenticated_user();
if (!$user || $user['credits'] < $cost) { json_response(['error' => 'Insufficient credits'], 400); }

try {
    $quality = $resolution === '512' ? 'low' : 'medium';
    $image_data = $reference_image_url !== ''
        ? openai_edit_image(local_image_path($reference_image_url), $prompt)
        : openai_generate_image($prompt, $quality);
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
        'prompt' => $prompt
    ],
    'credits_remaining' => $user['credits'] - $cost
]);
