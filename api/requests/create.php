<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/image_requests.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { json_response(['error' => 'Method not allowed'], 405); }

require_auth();
$user = get_authenticated_user();
if (!$user) { json_response(['error' => 'Unauthorized'], 401); }

$input = !empty($_POST) ? $_POST : (json_decode(file_get_contents('php://input'), true) ?: []);
$prompt = trim($input['prompt'] ?? '');
$format = $input['format'] ?? '1:1';
$renderQuality = $input['render_quality'] ?? 'standard';
$model = trim($input['model'] ?? '');
$referenceImageUrl = trim($input['reference_image_url'] ?? '');

if ($prompt === '') { json_response(['error' => 'Prompt required'], 400); }

try {
    $selection = image_generation_selection($format, $renderQuality, $model);
} catch (InvalidArgumentException $e) {
    json_response(['error' => $e->getMessage()], 400);
}

if ((int)$user['credits'] < $selection['cost']) {
    json_response(['error' => 'Insufficient credits'], 400);
}

global $pdo;
$ip_address = $_SERVER['HTTP_X_FORWARDED_FOR']
    ?? $_SERVER['HTTP_X_REAL_IP']
    ?? $_SERVER['REMOTE_ADDR']
    ?? null;
if ($ip_address !== null) {
    $ip_address = strtok($ip_address, ',');
    $ip_address = trim($ip_address);
}

try {
    $stmt = $pdo->prepare(
        'INSERT INTO generated_images
            (user_id, user_email, image_url, prompt, resolution, status, error_message, request_format, render_quality, credits_deducted, model_used, ip_address)
         VALUES (?, ?, NULL, ?, ?, ?, NULL, ?, ?, 0, ?, ?)'
    );
    $stmt->execute([
        $user['id'],
        $user['email'],
        $prompt,
        $selection['resolution'],
        'pending',
        $format,
        $renderQuality,
        $model ?: null,
        $ip_address,
    ]);

    $requestId = (int)$pdo->lastInsertId();
    if ($referenceImageUrl !== '') {
        $_SESSION['image_reference_' . $requestId] = $referenceImageUrl;
    }
} catch (Throwable $e) {
    json_response(['error' => 'Failed to save image request.'], 500);
}

json_response([
    'ok' => true,
    'request_id' => $requestId,
    'cost' => $selection['cost'],
]);
