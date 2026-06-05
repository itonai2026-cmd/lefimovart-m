<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/openai_images.php';
require_once __DIR__ . '/../includes/fal_images.php';
require_once __DIR__ . '/../includes/image_requests.php';

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
  try {
    $image_data = fal_generate_image($modelConfig, $prompt, $format, $renderQuality, $image_url);
  } catch (RuntimeException $falError) {
    error_log('Fal.ai image edit failed; trying OpenAI fallback: ' . $falError->getMessage());

    try {
      $legacyOptions = image_generation_options();
      $openAiSize = $legacyOptions[$format]['api_size'] ?? $legacyOptions['1:1']['api_size'];
      $image_data = openai_edit_image($localPath, $prompt, $openAiSize);
    } catch (RuntimeException $openAiError) {
      throw new RuntimeException(
        'Fal.ai failed: ' . $falError->getMessage() . ' OpenAI fallback failed: ' . $openAiError->getMessage()
      );
    }
  }

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
