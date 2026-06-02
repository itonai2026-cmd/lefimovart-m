<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/video_thumbs.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'GET') { json_response(['error' => 'Method not allowed'], 405); }

$payload = require_auth();
$user = get_authenticated_user();
global $pdo;

$id = intval($_GET['id'] ?? 0);
if (!$id) { json_response(['error' => 'Video ID required'], 400); }

$stmt = $pdo->prepare('SELECT id, status, video_url, thumbnail_url, queue_id, status_url, response_url, api_endpoint, error_message FROM videos WHERE id = ? AND user_email = ?');
$stmt->execute([$id, $user['email']]);
$video = $stmt->fetch();

if (!$video) { json_response(['error' => 'Video not found'], 404); }

if ($video['status'] === 'completed' || $video['status'] === 'failed') {
    json_response(['ok' => true, 'video' => $video]);
}

if (empty($video['queue_id'])) {
    json_response(['ok' => true, 'video' => $video]);
}

$status_url = $video['status_url'];
if (empty($status_url) && !empty($video['api_endpoint'])) {
    $status_url = rtrim($video['api_endpoint'], '/') . '/requests/' . $video['queue_id'] . '/status';
}
if (empty($status_url)) {
    json_response(['ok' => true, 'video' => $video]);
}

$ch = curl_init($status_url);
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPHEADER => [
        'Authorization: Key ' . FAL_AI_API_KEY
    ],
    CURLOPT_TIMEOUT => 10
]);
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($http_code !== 200) {
    json_response(['ok' => true, 'video' => $video]);
}

$fal_status = json_decode($response, true);

if (isset($fal_status['status']) && $fal_status['status'] === 'COMPLETED') {
    $result_url = $video['response_url'];
    if (empty($result_url) && !empty($video['api_endpoint'])) {
        $result_url = rtrim($video['api_endpoint'], '/') . '/requests/' . $video['queue_id'];
    }
    if (empty($result_url)) {
        json_response(['ok' => true, 'video' => $video]);
    }
    $ch2 = curl_init($result_url);
    curl_setopt_array($ch2, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            'Authorization: Key ' . FAL_AI_API_KEY
        ],
        CURLOPT_TIMEOUT => 10
    ]);
    $result_response = curl_exec($ch2);
    curl_close($ch2);

    $result = json_decode($result_response, true);
    $video_url = $result['video']['url'] ?? '';
    $fal_thumbnail = $result['thumbnail_url']
        ?? ($result['video']['thumbnail_url'] ?? null)
        ?? ($result['image']['url'] ?? null)
        ?? ($result['images'][0]['url'] ?? null)
        ?? '';

    if ($video_url) {
        $local_url = $video_url;
        $local_video_path = null;

        // Download video to local vid/ directory
        $vid_dir = __DIR__ . '/../../vid';
        if (!is_dir($vid_dir)) mkdir($vid_dir, 0755, true);

        $filename = 'video_' . $video['id'] . '_' . time() . '.mp4';
        $filepath = $vid_dir . '/' . $filename;

        $dlch = curl_init($video_url);
        curl_setopt_array($dlch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_TIMEOUT        => 300,
        ]);
        $video_bytes = curl_exec($dlch);
        $dl_http = curl_getinfo($dlch, CURLINFO_HTTP_CODE);
        curl_close($dlch);

        if ($dl_http >= 200 && $dl_http < 300 && $video_bytes !== false && strlen($video_bytes) > 0) {
            if (file_put_contents($filepath, $video_bytes) !== false) {
                $local_url = BASE_PATH . '/vid/' . $filename;
                $local_video_path = $filepath;
            }
        }

        // Best-effort poster: provider thumbnail first, else first frame via ffmpeg.
        $poster_url = download_video_poster((string)$fal_thumbnail, (int)$video['id']);
        if ($poster_url === null && $local_video_path !== null) {
            $poster_url = generate_video_poster_from_file($local_video_path, (int)$video['id']);
        }

        $upd = $pdo->prepare('UPDATE videos SET status = ?, video_url = ?, original_url = ?, thumbnail_url = ?, completed_at = NOW() WHERE id = ?');
        $upd->execute(['completed', $local_url, $video_url, $poster_url, $video['id']]);
        $video['status'] = 'completed';
        $video['video_url'] = $local_url;
        $video['thumbnail_url'] = $poster_url;
    }
} elseif (isset($fal_status['status']) && $fal_status['status'] === 'FAILED') {
    $error = $fal_status['error'] ?? 'Unknown error';
    $upd = $pdo->prepare('UPDATE videos SET status = ?, error_message = ? WHERE id = ?');
    $upd->execute(['failed', $error, $video['id']]);
    $video['status'] = 'failed';
    $video['error_message'] = $error;
}

json_response(['ok' => true, 'video' => $video]);
