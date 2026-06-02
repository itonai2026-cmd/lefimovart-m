<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/openai_images.php';
require_once __DIR__ . '/../includes/fal_images.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { json_response(['error' => 'Method not allowed'], 405); }

$payload = require_auth();
$input = !empty($_POST) ? $_POST : (json_decode(file_get_contents('php://input'), true) ?: []);

$prompt = $input['prompt'] ?? '';
$image_url = $input['image_url'] ?? '';

if (empty($prompt) || empty($image_url)) {
  json_response(['error' => 'Prompt and image_url required'], 400);
}

$user = get_authenticated_user();
if (!$user) { json_response(['error' => 'Unauthorized'], 401); }

global $pdo, $IMAGE_MODELS_CONFIG;
$modelConfig = $IMAGE_MODELS_CONFIG['nano_banana'];

// Detect source image dimensions to determine aspect ratio and cost.
$localPath = local_image_path($image_url);
$dims = @getimagesize($localPath);
$srcW = $dims ? $dims[0] : 1024;
$srcH = $dims ? $dims[1] : 1024;

$ratio = $srcW / $srcH;
if (abs($ratio - 1.0) < 0.15)       { $format = '1:1'; }
elseif (abs($ratio - 1.5) < 0.2)    { $format = '3:2'; }
elseif (abs($ratio - 0.667) < 0.15) { $format = '2:3'; }
elseif ($ratio >= 1.5)               { $format = '16:9'; }
else                                 { $format = '9:16'; }

// Standard quality for edits; hires if source is large (>2048 on longest side).
$renderQuality = max($srcW, $srcH) > 2048 ? 'hires' : 'standard';

$cost = $modelConfig['cost_table'][$format][$renderQuality]
     ?? $modelConfig['cost_table']['1:1']['standard']
     ?? 3;

if ($user['credits'] < $cost) {
  json_response(['error' => 'Insufficient credits', 'cost' => $cost], 400);
}

try {
  $fullImageUrl = fal_resolve_image_url($image_url);

  $payload = [
    'prompt' => $prompt,
    'reference_images' => [
      ['image_url' => $fullImageUrl, 'task_type' => 'subject'],
    ],
    'output_format' => 'png',
  ];

  $sizeValue = $modelConfig['size_map'][$format][$renderQuality] ?? '1:1';
  $payload[$modelConfig['size_param']] = $sizeValue;

  if ($renderQuality === 'hires' && !empty($modelConfig['hires_params'])) {
    $payload = array_merge($payload, $modelConfig['hires_params']);
  }

  $ch = curl_init($modelConfig['api_endpoint']);
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST           => true,
    CURLOPT_POSTFIELDS     => json_encode($payload),
    CURLOPT_HTTPHEADER     => [
      'Content-Type: application/json',
      'Authorization: Key ' . FAL_AI_API_KEY,
    ],
    CURLOPT_TIMEOUT        => 180,
  ]);
  $response = curl_exec($ch);
  $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  $curlError = curl_error($ch);
  curl_close($ch);

  if ($httpCode < 200 || $httpCode >= 300 || !$response) {
    $result = json_decode((string)$response, true) ?: [];
    $msg = $result['detail'] ?? $result['error']['message'] ?? $curlError ?: 'Fal.ai edit request failed.';
    throw new RuntimeException($msg);
  }

  $result = json_decode($response, true);
  $resultImageUrl = $result['images'][0]['url'] ?? '';
  if ($resultImageUrl === '') {
    throw new RuntimeException('Fal.ai did not return an edited image.');
  }

  $image_data = fal_download_image($resultImageUrl);
  $edited_url = save_image_bytes($image_data, 'edited_');

  $pdo->beginTransaction();
  $stmt = $pdo->prepare('UPDATE users SET credits = credits - ? WHERE id = ? AND credits >= ?');
  $stmt->execute([$cost, $user['id'], $cost]);
  if ($stmt->rowCount() !== 1) {
    throw new RuntimeException('Insufficient credits');
  }
  $stmt = $pdo->prepare('SELECT credits FROM users WHERE id = ?');
  $stmt->execute([$user['id']]);
  $credits_remaining = (int)$stmt->fetchColumn();
  $pdo->commit();

  json_response([
    'ok' => true,
    'url' => $edited_url,
    'credits_remaining' => $credits_remaining,
    'credits_used' => $cost,
  ]);

} catch (Throwable $e) {
  if (isset($pdo) && $pdo->inTransaction()) $pdo->rollBack();
  json_response(['error' => 'Edit failed: ' . $e->getMessage()], 502);
}
