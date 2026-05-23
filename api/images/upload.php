<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/auth.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { json_response(['error' => 'Method not allowed'], 405); }

$payload = require_auth();

if (!isset($_FILES['file'])) {
  json_response(['error' => 'File required'], 400);
}

$file = $_FILES['file'];
if ($file['error'] !== UPLOAD_ERR_OK) {
  json_response(['error' => 'Upload error: ' . $file['error']], 400);
}
if ($file['size'] > MAX_UPLOAD_SIZE) {
  json_response(['error' => 'Image too large. Maximum 50MB.'], 400);
}

$mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
$extensions = ['image/png' => 'png', 'image/jpeg' => 'jpg', 'image/webp' => 'webp'];
if (!isset($extensions[$mime])) {
  json_response(['error' => 'Only PNG, JPG and WebP images are allowed.'], 400);
}

// Ensure img directory exists
$img_dir = __DIR__ . '/../../img';
if (!is_dir($img_dir)) {
  mkdir($img_dir, 0755, true);
}

$filename = uniqid('upload_', true) . '.' . $extensions[$mime];
$filepath = $img_dir . '/' . $filename;

if (!move_uploaded_file($file['tmp_name'], $filepath)) {
  json_response(['error' => 'Failed to save file'], 500);
}

// Return the public URL
$file_url = '/wp/lefimovart/img/' . $filename;
json_response(['ok' => true, 'file_url' => $file_url]);
