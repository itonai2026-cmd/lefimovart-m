<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/auth.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$payload = require_auth();
$user = get_authenticated_user();
if (!$user) { json_response(['error' => 'Unauthorized'], 401); }
global $pdo;

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $stmt = $pdo->prepare("SELECT id, prompt, model_used, status, video_url, thumbnail_url, error_message, created_at FROM videos WHERE user_email = ? AND (flagged IS NULL OR flagged = 0 OR flagged = '' OR flagged = '0') ORDER BY created_at DESC LIMIT 50");
    $stmt->execute([$user['email']]);
    $videos = $stmt->fetchAll();
    json_response(['ok' => true, 'videos' => $videos]);
}

if ($_SERVER['REQUEST_METHOD'] === 'DELETE') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = (int)($input['id'] ?? 0);
    if ($id < 1) { json_response(['ok' => false, 'error' => 'Invalid video ID'], 400); }

    $stmt = $pdo->prepare('SELECT id, video_url FROM videos WHERE id = ? AND user_email = ?');
    $stmt->execute([$id, $user['email']]);
    $video = $stmt->fetch();
    if (!$video) { json_response(['ok' => false, 'error' => 'Video not found'], 404); }

    // Delete local file if video_url points to a local path
    $url = $video['video_url'] ?? '';
    if ($url !== '') {
        $localPath = '';
        $docRoot = $_SERVER['DOCUMENT_ROOT'] ?? '';
        $repoRoot = realpath(__DIR__ . '/../..');

        if (strpos($url, '/') === 0 && !preg_match('#^https?://#', $url)) {
            // Relative path like /wp/lefimovart/vid/video_1.mp4
            if ($docRoot !== '') {
                $localPath = $docRoot . $url;
            }
            // Fallback: resolve via BASE_PATH prefix
            if (($localPath === '' || !is_file($localPath)) && strpos($url, BASE_PATH) === 0) {
                $relative = substr($url, strlen(BASE_PATH));
                $localPath = $repoRoot . $relative;
            }
        } elseif (preg_match('#^https?://[^/]+(/wp/lefimovart/.+)$#', $url, $m)) {
            if ($docRoot !== '') {
                $localPath = $docRoot . $m[1];
            }
            if (($localPath === '' || !is_file($localPath)) && strpos($m[1], BASE_PATH) === 0) {
                $relative = substr($m[1], strlen(BASE_PATH));
                $localPath = $repoRoot . $relative;
            }
        }
        if ($localPath !== '' && is_file($localPath)) {
            @unlink($localPath);
        }
    }

    $del = $pdo->prepare('DELETE FROM videos WHERE id = ? AND user_email = ?');
    $del->execute([$id, $user['email']]);
    json_response(['ok' => true]);
}

json_response(['error' => 'Method not allowed'], 405);
