<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/openai_images.php';
require_once __DIR__ . '/../includes/image_requests.php';
require_once __DIR__ . '/../includes/fal_images.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { json_response(['error' => 'Method not allowed'], 405); }

$payload = require_auth();
$input = !empty($_POST) ? $_POST : (json_decode(file_get_contents('php://input'), true) ?: []);

$requestId = (int)($input['request_id'] ?? 0);
if ($requestId < 1) { json_response(['error' => 'Image request ID required'], 400); }

$user = get_authenticated_user();
if (!$user) { json_response(['error' => 'Unauthorized'], 401); }

global $pdo, $IMAGE_MODELS_CONFIG;
$stmt = $pdo->prepare(
    'SELECT id, prompt, request_format, render_quality, status, model_used
     FROM generated_images
     WHERE id = ? AND user_id = ?'
);
$stmt->execute([$requestId, $user['id']]);
$request = $stmt->fetch();
if (!$request) { json_response(['error' => 'Image request not found'], 404); }
if ($request['status'] !== 'pending') { json_response(['error' => 'Image request has already been processed'], 409); }

$model = $request['model_used'] ?? '';

try {
    $selection = image_generation_selection($request['request_format'], $request['render_quality'], $model);
} catch (InvalidArgumentException $e) {
    json_response(['error' => $e->getMessage()], 400);
}
if ((int)$user['credits'] < $selection['cost']) { json_response(['error' => 'Insufficient credits'], 400); }

$claim = $pdo->prepare('UPDATE generated_images SET status = ? WHERE id = ? AND user_id = ? AND status = ?');
$claim->execute(['processing', $requestId, $user['id'], 'pending']);
if ($claim->rowCount() !== 1) { json_response(['error' => 'Image request is already processing'], 409); }

$referenceImageUrl = $_SESSION['image_reference_' . $requestId] ?? '';
unset($_SESSION['image_reference_' . $requestId]);

try {
    $useFal = ($model !== '' && isset($IMAGE_MODELS_CONFIG[$model]));

    if ($useFal) {
        $modelConfig = $IMAGE_MODELS_CONFIG[$model];
        $image_data = fal_generate_image(
            $modelConfig,
            $request['prompt'],
            $request['request_format'],
            $request['render_quality'],
            $referenceImageUrl
        );
    } else {
        $quality = 'medium';
        $image_data = $referenceImageUrl !== ''
            ? openai_edit_image(local_image_path($referenceImageUrl), $request['prompt'], $selection['api_size'])
            : openai_generate_image($request['prompt'], $quality, $selection['api_size']);
        if ($selection['resolution'] !== $selection['api_size']) {
            $image_data = render_image_dimensions($image_data, $selection['width'], $selection['height']);
        }
    }

    $image_url = save_image_bytes($image_data, 'img_');
} catch (RuntimeException $e) {
    $failure = $pdo->prepare('UPDATE generated_images SET status = ?, error_message = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?');
    $failure->execute(['failed', $e->getMessage(), $requestId, $user['id']]);
    json_response(['error' => $e->getMessage()], 502);
}

try {
    $pdo->beginTransaction();
    $upd = $pdo->prepare('UPDATE users SET credits = credits - ? WHERE id = ? AND credits >= ?');
    $upd->execute([$selection['cost'], $user['id'], $selection['cost']]);
    if ($upd->rowCount() !== 1) {
        throw new RuntimeException('Insufficient credits');
    }
    $stmt = $pdo->prepare(
        'UPDATE generated_images
         SET image_url = ?, status = ?, credits_deducted = ?, error_message = NULL, completed_at = CURRENT_TIMESTAMP
         WHERE id = ? AND user_id = ? AND status = ?'
    );
    $stmt->execute([$image_url, 'ready', $selection['cost'], $requestId, $user['id'], 'processing']);
    if ($stmt->rowCount() !== 1) {
        throw new RuntimeException('Image request could not be completed');
    }
    $pdo->commit();
} catch (Throwable $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    $failure = $pdo->prepare('UPDATE generated_images SET status = ?, error_message = ?, completed_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?');
    $failure->execute(['failed', $e->getMessage(), $requestId, $user['id']]);
    json_response(['error' => $e->getMessage()], 500);
}

json_response([
    'ok' => true,
    'image' => [
        'id' => $requestId,
        'url' => $image_url,
        'prompt' => $request['prompt'],
        'format' => $request['request_format'],
        'resolution' => $selection['resolution'],
    ],
    'credits_used' => $selection['cost'],
    'credits_remaining' => $user['credits'] - $selection['cost']
]);
