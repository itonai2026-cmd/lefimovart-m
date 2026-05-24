<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/auth.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { json_response(['error' => 'Method not allowed'], 405); }

$payload = require_auth();
$user = get_authenticated_user();
if (!$user) { json_response(['error' => 'Unauthorized'], 401); }

global $pdo;

function delete_local_upload(?string $url): void {
    if (!$url) { return; }

    $path = parse_url($url, PHP_URL_PATH);
    if (!$path || strpos($path, '/uploads/') === false) { return; }

    $relative = substr($path, strpos($path, '/uploads/') + strlen('/uploads/'));
    if ($relative === '' || strpos($relative, '..') !== false) { return; }

    $upload_root = realpath(UPLOAD_DIR);
    if (!$upload_root) { return; }

    $candidate = UPLOAD_DIR . str_replace(['/', '\\'], DIRECTORY_SEPARATOR, $relative);
    $candidate_dir = realpath(dirname($candidate));
    if (!$candidate_dir || strpos($candidate_dir, $upload_root) !== 0) { return; }

    if (is_file($candidate)) {
        @unlink($candidate);
    }
}

try {
    $stmt = $pdo->prepare('SELECT image_url FROM generated_images WHERE user_id = ? OR user_email = ?');
    $stmt->execute([$user['id'], $user['email']]);
    $image_urls = $stmt->fetchAll(PDO::FETCH_COLUMN);

    $stmt = $pdo->prepare('SELECT image_path, video_url, thumbnail_url FROM videos WHERE user_id = ? OR user_email = ?');
    $stmt->execute([$user['id'], $user['email']]);
    $video_files = $stmt->fetchAll();

    $pdo->beginTransaction();

    $pdo->prepare('DELETE FROM generated_images WHERE user_id = ? OR user_email = ?')
        ->execute([$user['id'], $user['email']]);
    $pdo->prepare('DELETE FROM videos WHERE user_id = ? OR user_email = ?')
        ->execute([$user['id'], $user['email']]);
    $pdo->prepare('DELETE FROM processed_payments WHERE user_id = ? OR user_email = ?')
        ->execute([$user['id'], $user['email']]);
    $pdo->prepare('DELETE FROM password_resets WHERE user_id = ? OR email = ?')
        ->execute([$user['id'], $user['email']]);
    $pdo->prepare('DELETE FROM auth_tokens WHERE user_id = ?')
        ->execute([$user['id']]);
    $pdo->prepare('DELETE FROM users WHERE id = ?')
        ->execute([$user['id']]);

    $pdo->commit();

    foreach ($image_urls as $url) {
        delete_local_upload($url);
    }
    foreach ($video_files as $file) {
        delete_local_upload($file['image_path'] ?? null);
        delete_local_upload($file['video_url'] ?? null);
        delete_local_upload($file['thumbnail_url'] ?? null);
    }

    json_response(['ok' => true]);
} catch (Exception $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('Account deletion failed: ' . $e->getMessage());
    json_response(['error' => 'Account deletion failed'], 500);
}
