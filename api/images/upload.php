<?php
/**
 * Upload an image file and return its public URL.
 * POST multipart/form-data with field "file".
 */
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/auth.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { json_response(['error' => 'Method not allowed'], 405); }

$payload = require_auth();

if (empty($_FILES['file'])) { json_response(['error' => 'No file uploaded'], 400); }

$file = $_FILES['file'];
if ($file['error'] !== UPLOAD_ERR_OK) { json_response(['error' => 'Upload error: ' . $file['error']], 400); }
if ($file['size'] > MAX_UPLOAD_SIZE) { json_response(['error' => 'File too large'], 400); }

$allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
$mime = mime_content_type($file['tmp_name']);
if (!in_array($mime, $allowed)) { json_response(['error' => 'Invalid file type'], 400); }

$ext_map = ['image/png' => 'png', 'image/jpeg' => 'jpg', 'image/webp' => 'webp', 'image/gif' => 'gif'];
$ext = $ext_map[$mime] ?? 'png';
$filename = uniqid('img_', true) . '.' . $ext;

$upload_dir = UPLOAD_DIR;
if (!is_dir($upload_dir)) { mkdir($upload_dir, 0755, true); }

$dest = $upload_dir . $filename;
if (!move_uploaded_file($file['tmp_name'], $dest)) {
    json_response(['error' => 'Failed to save file'], 500);
}

$file_url = APP_URL . BASE_PATH . '/uploads/' . $filename;

json_response(['ok' => true, 'file_url' => $file_url]);
