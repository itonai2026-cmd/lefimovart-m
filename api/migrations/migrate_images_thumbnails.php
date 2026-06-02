<?php
/**
 * One-time migration: generate gallery thumbnails for existing images.
 *
 * Full-resolution gallery images (up to 3584x2048) exhaust the image-memory
 * budget of mobile browsers when ~10 are decoded at once, so only the first
 * few render. This backfills a small JPEG thumbnail for every locally stored
 * image and records it in generated_images.thumbnail_url so the gallery can
 * serve the lightweight version.
 *
 * Run via browser:
 *   https://your-domain.com/wp/lefimovart/api/migrations/migrate_images_thumbnails.php?token=migrate2025video
 *
 * Safe to re-run — skips images that already have a usable thumbnail.
 */

$token = $_GET['token'] ?? '';
if ($token !== 'migrate2025video') {
    http_response_code(403);
    echo 'Access denied. Use ?token=migrate2025video';
    exit;
}

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/openai_images.php';
require_once __DIR__ . '/../includes/generated_images.php';

header('Content-Type: text/html; charset=utf-8');

global $pdo;

echo '<!DOCTYPE html><html><head><title>Image Thumbnail Migration</title>';
echo '<style>body{font-family:monospace;background:#1a1a2e;color:#e0e0e0;padding:20px;line-height:1.6}';
echo '.ok{color:#4ade80}.fail{color:#f87171}.skip{color:#facc15}.info{color:#60a5fa}';
echo 'h1{color:#fff}hr{border-color:#333}.summary{background:#222;padding:15px;border-radius:8px;margin-top:20px}</style>';
echo '</head><body>';
echo '<h1>🖼️ Image Thumbnail Migration</h1><hr>';

ensure_generated_images_thumbnail_url_column($pdo);

if (!function_exists('imagecreatefromstring')) {
    echo "<p class='fail'>PHP GD extension is not available — thumbnails cannot be generated. Aborting.</p></body></html>";
    exit;
}

$prefix = BASE_PATH . '/img/';
$storageDir = image_storage_dir();

$stmt = $pdo->query("SELECT id, image_url, thumbnail_url FROM generated_images WHERE image_url IS NOT NULL AND image_url != ''");
$rows = $stmt->fetchAll();

echo "<p class='info'>Found <strong>" . count($rows) . "</strong> image row(s) to check.</p><hr>";

$created = 0;
$skipped = 0;
$failed = 0;

if (ob_get_level()) ob_end_flush();
flush();

foreach ($rows as $row) {
    $id = $row['id'];
    $imageUrl = $row['image_url'];

    // Already has a thumbnail file on disk → nothing to do.
    if (!empty($row['thumbnail_url'])) {
        $existingName = basename(parse_url($row['thumbnail_url'], PHP_URL_PATH) ?: '');
        if ($existingName !== '' && is_file($storageDir . '/thumbs/' . $existingName)) {
            $skipped++;
            continue;
        }
    }

    // Only locally stored images can be downscaled here.
    $path = parse_url($imageUrl, PHP_URL_PATH) ?: '';
    if (strpos($path, $prefix) !== 0) {
        echo "<p class='skip'>[SKIP] Image #$id — not a local /img/ URL: <small>" . htmlspecialchars($imageUrl, ENT_QUOTES) . "</small></p>";
        $skipped++;
        flush();
        continue;
    }

    $filename = basename($path);
    $srcPath = $storageDir . '/' . $filename;
    if (!is_file($srcPath)) {
        echo "<p class='fail'>[MISS] Image #$id — file not found: <small>$filename</small></p>";
        $failed++;
        flush();
        continue;
    }

    $bytes = file_get_contents($srcPath);
    $thumbUrl = $bytes !== false ? save_image_thumbnail($bytes, $filename) : null;
    if ($thumbUrl === null) {
        echo "<p class='fail'>[FAILED] Image #$id — could not build thumbnail for $filename</p>";
        $failed++;
        flush();
        continue;
    }

    $upd = $pdo->prepare('UPDATE generated_images SET thumbnail_url = ? WHERE id = ?');
    $upd->execute([$thumbUrl, $id]);

    echo "<p class='ok'>[OK] Image #$id → $thumbUrl</p>";
    $created++;
    flush();
}

echo '<hr><div class="summary">';
echo "<p><strong>Results:</strong></p>";
echo "<p class='ok'>Thumbnails created: <strong>$created</strong></p>";
echo "<p class='skip'>Skipped (already done / external): <strong>$skipped</strong></p>";
echo "<p class='fail'>Failed / missing: <strong>$failed</strong></p>";
echo '</div></body></html>';
