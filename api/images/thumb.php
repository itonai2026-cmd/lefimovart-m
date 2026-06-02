<?php
/**
 * On-the-fly thumbnail endpoint for gallery images.
 *
 * Gallery grids only need small previews, but generated images are stored at
 * full resolution (up to 3584x2048). Decoding ~10 full-res PNGs at once blows
 * past the per-page image memory budget of mobile browsers, so only the first
 * few render. This endpoint serves a cached, downscaled JPEG instead.
 *
 * Public (no auth) on purpose: it is loaded directly by <img> tags, exactly
 * like the static /img/ files it derives from, and only ever reads files that
 * already live in the public image directory.
 *
 * Usage: /wp/lefimovart/api/images/thumb.php?f=img_xxx.png&w=512
 */

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/openai_images.php';

$requestedFile = $_GET['f'] ?? $_GET['file'] ?? '';
$width = (int)($_GET['w'] ?? 512);
if ($width < 64) $width = 64;
if ($width > 1024) $width = 1024;

// Only a bare filename with a known image extension is allowed (no traversal).
$file = basename((string)$requestedFile);
if ($file === '' || !preg_match('/^[A-Za-z0-9._-]+\.(png|jpe?g|webp)$/i', $file)) {
    http_response_code(400);
    exit;
}

$srcPath = image_storage_dir() . '/' . $file;
if (!is_file($srcPath)) {
    http_response_code(404);
    exit;
}

function thumb_serve_file(string $path, string $contentType): void {
    header('Content-Type: ' . $contentType);
    header('Cache-Control: public, max-age=31536000, immutable');
    header('Content-Length: ' . filesize($path));
    readfile($path);
    exit;
}

$originalType = function_exists('mime_content_type') ? (mime_content_type($srcPath) ?: 'image/png') : 'image/png';

// If GD is unavailable, fall back to streaming the original file.
if (!function_exists('imagecreatefromstring')) {
    thumb_serve_file($srcPath, $originalType);
}

$thumbsDir = image_storage_dir() . '/thumbs';
if (!is_dir($thumbsDir) && !mkdir($thumbsDir, 0755, true) && !is_dir($thumbsDir)) {
    thumb_serve_file($srcPath, $originalType);
}
$thumbPath = $thumbsDir . '/' . $width . '_' . $file . '.jpg';

// Serve cached thumbnail when it is at least as new as the source.
if (is_file($thumbPath) && filemtime($thumbPath) >= filemtime($srcPath)) {
    thumb_serve_file($thumbPath, 'image/jpeg');
}

$bytes = file_get_contents($srcPath);
$source = $bytes !== false ? @imagecreatefromstring($bytes) : false;
if ($source === false) {
    thumb_serve_file($srcPath, $originalType);
}

$sourceWidth = imagesx($source);
$sourceHeight = imagesy($source);

// Already small enough — no point downscaling.
if ($sourceWidth <= $width) {
    imagedestroy($source);
    thumb_serve_file($srcPath, $originalType);
}

$targetWidth = $width;
$targetHeight = (int)max(1, round($sourceHeight * ($width / $sourceWidth)));

$output = imagecreatetruecolor($targetWidth, $targetHeight);
// Flatten transparency onto white so the JPEG looks correct.
$white = imagecolorallocate($output, 255, 255, 255);
imagefilledrectangle($output, 0, 0, $targetWidth, $targetHeight, $white);
imagecopyresampled(
    $output,
    $source,
    0, 0, 0, 0,
    $targetWidth, $targetHeight,
    $sourceWidth, $sourceHeight
);

$saved = imagejpeg($output, $thumbPath, 82);
imagedestroy($output);
imagedestroy($source);

if ($saved && is_file($thumbPath)) {
    thumb_serve_file($thumbPath, 'image/jpeg');
}

// Last resort: original file.
thumb_serve_file($srcPath, $originalType);
