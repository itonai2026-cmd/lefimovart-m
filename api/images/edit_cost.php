<?php
/**
 * Return the AI-edit credit cost for a given image based on its resolution.
 *
 * GET /api/images/edit_cost.php?image_url=…
 * Response: { "ok": true, "cost": 3, "format": "1:1", "quality": "standard" }
 */
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/openai_images.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'GET') { json_response(['error' => 'Method not allowed'], 405); }

$payload = require_auth();

$image_url = $_GET['image_url'] ?? '';
if (empty($image_url)) {
  json_response(['error' => 'image_url required'], 400);
}

global $IMAGE_MODELS_CONFIG;
$modelConfig = $IMAGE_MODELS_CONFIG['nano_banana'];

try {
  $localPath = local_image_path($image_url);
  $dims = @getimagesize($localPath);
  $srcW = $dims ? $dims[0] : 1024;
  $srcH = $dims ? $dims[1] : 1024;
} catch (Throwable $e) {
  $srcW = 1024;
  $srcH = 1024;
}

$ratio = $srcW / $srcH;
if (abs($ratio - 1.0) < 0.15)       { $format = '1:1'; }
elseif (abs($ratio - 1.5) < 0.2)    { $format = '3:2'; }
elseif (abs($ratio - 0.667) < 0.15) { $format = '2:3'; }
elseif ($ratio >= 1.5)               { $format = '16:9'; }
else                                 { $format = '9:16'; }

$renderQuality = max($srcW, $srcH) > 2048 ? 'hires' : 'standard';

$cost = $modelConfig['cost_table'][$format][$renderQuality]
     ?? $modelConfig['cost_table']['1:1']['standard']
     ?? 3;

json_response([
  'ok' => true,
  'cost' => $cost,
  'format' => $format,
  'quality' => $renderQuality,
  'width' => $srcW,
  'height' => $srcH,
]);
