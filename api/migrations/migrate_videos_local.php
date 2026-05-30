<?php
/**
 * One-time migration script: downloads existing Fal.ai-hosted videos
 * to the local vid/ directory and updates video_url in the database.
 *
 * Usage (run from server command line):
 *   php api/migrations/migrate_videos_local.php
 *
 * Safe to re-run — skips videos that already have local paths.
 */

require_once __DIR__ . '/../config.php';

global $pdo;

$vid_dir = realpath(__DIR__ . '/../..') . '/vid';
if (!is_dir($vid_dir)) {
    mkdir($vid_dir, 0755, true);
    echo "Created directory: $vid_dir\n";
}

$stmt = $pdo->query("SELECT id, video_url FROM videos WHERE status = 'completed' AND video_url IS NOT NULL AND video_url != ''");
$videos = $stmt->fetchAll();

echo "Found " . count($videos) . " completed video(s) to check.\n\n";

$downloaded = 0;
$skipped = 0;
$failed = 0;

foreach ($videos as $v) {
    $url = $v['video_url'];

    // Skip if already a local path (not an http URL)
    if (strpos($url, 'http') !== 0) {
        echo "[SKIP] Video #{$v['id']} — already local: $url\n";
        $skipped++;
        continue;
    }

    echo "[DOWNLOAD] Video #{$v['id']} from: $url\n";

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
        echo "  [FAILED] HTTP $http_code — " . ($curl_error ?: 'empty response') . "\n";
        echo "  Video #{$v['id']} URL may have expired. Keeping original URL in DB.\n\n";
        $failed++;
        continue;
    }

    if (file_put_contents($filepath, $bytes) === false) {
        echo "  [FAILED] Could not write file: $filepath\n\n";
        $failed++;
        continue;
    }

    $local_url = BASE_PATH . '/vid/' . $filename;
    $upd = $pdo->prepare('UPDATE videos SET video_url = ? WHERE id = ?');
    $upd->execute([$local_url, $v['id']]);

    $size_mb = round(strlen($bytes) / 1024 / 1024, 2);
    echo "  [OK] Saved: $filepath ($size_mb MB)\n";
    echo "  [OK] DB updated: video_url = $local_url\n\n";
    $downloaded++;
}

echo "---\n";
echo "Done! Downloaded: $downloaded, Skipped (already local): $skipped, Failed: $failed\n";
if ($failed > 0) {
    echo "\nNote: Failed downloads are likely due to expired Fal.ai URLs.\n";
    echo "Those videos will keep their original external URLs.\n";
}
