<?php
/**
 * Run pending database migrations via browser.
 *
 * URL: https://your-domain.com/wp/lefimovart/api/migrations/run_migrations.php?token=migrate2025video
 *
 * Safe to re-run — uses IF NOT EXISTS.
 */

$token = $_GET['token'] ?? '';
if ($token !== 'migrate2025video') {
    http_response_code(403);
    echo 'Access denied. Use ?token=migrate2025video';
    exit;
}

require_once __DIR__ . '/../config.php';

header('Content-Type: text/html; charset=utf-8');

global $pdo;

echo '<!DOCTYPE html><html><head><title>DB Migrations</title>';
echo '<style>body{font-family:monospace;background:#1a1a2e;color:#e0e0e0;padding:20px;line-height:1.6}';
echo '.ok{color:#4ade80}.fail{color:#f87171}.info{color:#60a5fa}';
echo 'h1{color:#fff}hr{border-color:#333}.summary{background:#222;padding:15px;border-radius:8px;margin-top:20px}</style>';
echo '</head><body>';
echo '<h1>🗄️ Database Migrations</h1><hr>';

$migrations = [
    'Add flagged column to videos' => 'ALTER TABLE videos ADD COLUMN IF NOT EXISTS flagged TINYINT(1) NOT NULL DEFAULT 0',
    'Add flagged_reason column to videos' => 'ALTER TABLE videos ADD COLUMN IF NOT EXISTS flagged_reason VARCHAR(120) DEFAULT NULL',
    'Add model_used column to generated_images' => 'ALTER TABLE generated_images ADD COLUMN IF NOT EXISTS model_used VARCHAR(50) DEFAULT NULL',
    'Add original_url column to videos' => 'ALTER TABLE videos ADD COLUMN IF NOT EXISTS original_url TEXT DEFAULT NULL',
];

$ok = 0;
$fail = 0;

foreach ($migrations as $name => $sql) {
    echo "<p class='info'>Running: <strong>$name</strong></p>";
    echo "<p><small>$sql</small></p>";
    try {
        $pdo->exec($sql);
        echo "<p class='ok'>&nbsp;&nbsp;[OK] Done.</p>";
        $ok++;
    } catch (PDOException $e) {
        echo "<p class='fail'>&nbsp;&nbsp;[FAILED] " . htmlspecialchars($e->getMessage()) . "</p>";
        $fail++;
    }
    echo '<hr>';
}

echo '<div class="summary">';
echo "<p><strong>Results:</strong> $ok succeeded, $fail failed</p>";
echo '</div></body></html>';
