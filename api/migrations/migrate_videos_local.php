<?php
/**
 * One-time migration: downloads existing Fal.ai-hosted videos
 * to the local vid/ directory and updates video_url in the database.
 *
 * Run via browser:
 *   https://your-domain.com/wp/lefimovart/api/migrations/migrate_videos_local.php?token=migrate2025video
 *
 * Safe to re-run — skips videos that already have local paths.
 */

// Security: require token in URL to prevent unauthorized access
$token = $_GET['token'] ?? '';
if ($token !== 'migrate2025video') {
    http_response_code(403);
    echo 'Access denied. Use ?token=migrate2025video';
    exit;
}

require_once __DIR__ . '/../config.php';

header('Content-Type: text/html; charset=utf-8');

global $pdo;

echo '<!DOCTYPE html><html><head><title>Video Migration</title>';
echo '<style>body{font-family:monospace;background:#1a1a2e;color:#e0e0e0;padding:20px;line-height:1.6}';
echo '.ok{color:#4ade80}.fail{color:#f87171}.skip{color:#facc15}.info{color:#60a5fa}';
echo 'h1{color:#fff}hr{border-color:#333}.summary{background:#222;padding:15px;border-radius:8px;margin-top:20px}</style>';
echo '</head><body>';
echo '<h1>🎬 Video Migration — Download to Local Storage</h1><hr>';

$vid_dir = realpath(__DIR__ . '/../..') . '/vid';
if (!is_dir($vid_dir)) {
    mkdir($vid_dir, 0755, true);
    echo "<p class='info'>Created directory: $vid_dir</p>";
}

$stmt = $pdo->query("SELECT id, video_url FROM videos WHERE status = 'completed' AND video_url IS NOT NULL AND video_url != ''");
$videos = $stmt->fetchAll();

echo "<p class='info'>Found <strong>" . count($videos) . "</strong> completed video(s) to check.</p><hr>";

$downloaded = 0;
$skipped = 0;
$failed = 0;

// Flush output progressively
if (ob_get_level()) ob_end_flush();
flush();

foreach ($videos as $v) {
    $url = $v['video_url'];

    // Skip if already a local path (not an http URL)
    if (strpos($url, 'http') !== 0) {
        echo "<p class='skip'>[SKIP] Video #{$v['id']} — already local: $url</p>";
        $skipped++;
        flush();
        continue;
    }

    echo "<p class='info'>[DOWNLOAD] Video #{$v['id']} from: <small>$url</small></p>";
    flush();

    $filename = 'video_' . $v['id'] . '_' . time() . '.mp4';
    $filepath = $vid_dir . '/' . $filename;

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT        => 300,
    ]);
    $bytes = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curl_error = curl_error($ch);
    curl_close($ch);

    if ($http_code < 200 || $http_code >= 300 || $bytes === false || strlen($bytes) === 0) {
        echo "<p class='fail'>&nbsp;&nbsp;[FAILED] HTTP $http_code — " . htmlspecialchars($curl_error ?: 'empty response', ENT_QUOTES) . "</p>";
        echo "<p class='fail'>&nbsp;&nbsp;Video #{$v['id']} URL may have expired. Keeping original URL in DB.</p>";
        $failed++;
        flush();
        continue;
    }

    if (file_put_contents($filepath, $bytes) === false) {
        echo "<p class='fail'>&nbsp;&nbsp;[FAILED] Could not write file: $filepath</p>";
        $failed++;
        flush();
        continue;
    }

    $local_url = BASE_PATH . '/vid/' . $filename;
    $upd = $pdo->prepare('UPDATE videos SET video_url = ?, original_url = ? WHERE id = ?');
    $upd->execute([$local_url, $url, $v['id']]);

    $size_mb = round(strlen($bytes) / 1024 / 1024, 2);
    echo "<p class='ok'>&nbsp;&nbsp;[OK] Saved: $filename ($size_mb MB)</p>";
    echo "<p class='ok'>&nbsp;&nbsp;[OK] DB updated: video_url = $local_url</p>";
    $downloaded++;
    flush();
}

echo '<hr><div class="summary">';
echo "<p><strong>Results:</strong></p>";
echo "<p class='ok'>Downloaded: <strong>$downloaded</strong></p>";
echo "<p class='skip'>Skipped (already local): <strong>$skipped</strong></p>";
echo "<p class='fail'>Failed: <strong>$failed</strong></p>";
if ($failed > 0) {
    echo "<p class='fail'><br>Note: Failed downloads are likely due to expired Fal.ai URLs.<br>Those videos keep their original external URLs.</p>";
}
echo '</div></body></html>';
