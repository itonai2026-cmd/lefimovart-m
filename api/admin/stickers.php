<?php
/**
 * Admin Sticker CRUD
 *
 * GET    /api/admin/stickers.php              → list all stickers
 * POST   /api/admin/stickers.php              → create sticker (multipart: file + name + category)
 * PUT    /api/admin/stickers.php?id=X         → update category
 * DELETE /api/admin/stickers.php?id=X         → delete sticker
 */
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/jwt.php';
require_once __DIR__ . '/../includes/auth.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$payload = require_auth();
$current_user = get_authenticated_user();
if (!$current_user) { json_response(['error' => 'Unauthorized'], 401); }
if (($current_user['role'] ?? 'user') !== 'admin') { json_response(['error' => 'Forbidden'], 403); }

global $pdo;

// Auto-create stickers table if missing
$pdo->exec("CREATE TABLE IF NOT EXISTS stickers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL DEFAULT '',
    url VARCHAR(512) NOT NULL,
    category VARCHAR(100) NOT NULL DEFAULT 'Custom',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_category (category),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

$method = $_SERVER['REQUEST_METHOD'];

// ── LIST ─────────────────────────────────────────────────────────────────
if ($method === 'GET') {
    $stmt = $pdo->query('SELECT id, name, url, category, created_at FROM stickers ORDER BY created_at DESC LIMIT 500');
    json_response(['ok' => true, 'stickers' => $stmt->fetchAll()]);
}

// ── CREATE (multipart upload) ────────────────────────────────────────────
if ($method === 'POST') {
    if (!isset($_FILES['file'])) {
        json_response(['error' => 'No file provided'], 400);
    }

    $file = $_FILES['file'];
    $name = isset($_POST['name']) ? trim($_POST['name']) : '';
    $category = isset($_POST['category']) ? trim($_POST['category']) : 'Custom';

    if (empty($name)) {
        $name = preg_replace('/\.[^.]+$/', '', basename($file['name']));
    }

    $allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif'];
    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mime = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    if (!in_array($mime, $allowed)) {
        json_response(['error' => 'Invalid file type. Allowed: PNG, JPG, WebP, SVG, GIF'], 400);
    }

    $stickerDir = __DIR__ . '/../../uploads/stickers/';
    if (!is_dir($stickerDir)) {
        mkdir($stickerDir, 0755, true);
    }

    $ext = pathinfo($file['name'], PATHINFO_EXTENSION) ?: 'png';
    $filename = uniqid('stk_') . '.' . $ext;
    $filepath = $stickerDir . $filename;

    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        json_response(['error' => 'Failed to save file'], 500);
    }

    $url = BASE_PATH . '/uploads/stickers/' . $filename;

    $stmt = $pdo->prepare('INSERT INTO stickers (name, url, category) VALUES (?, ?, ?)');
    $stmt->execute([$name, $url, $category]);
    $id = (int)$pdo->lastInsertId();

    json_response([
        'ok' => true,
        'sticker' => [
            'id' => $id,
            'name' => $name,
            'url' => $url,
            'category' => $category,
        ],
    ]);
}

// ── UPDATE (change category) ─────────────────────────────────────────────
if ($method === 'PUT') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id <= 0) { json_response(['error' => 'Missing sticker id'], 400); }

    $input = json_decode(file_get_contents('php://input'), true) ?: [];
    $category = isset($input['category']) ? trim($input['category']) : '';
    if (empty($category)) { json_response(['error' => 'Missing category'], 400); }

    $stmt = $pdo->prepare('UPDATE stickers SET category = ? WHERE id = ?');
    $stmt->execute([$category, $id]);

    json_response(['ok' => true]);
}

// ── DELETE ────────────────────────────────────────────────────────────────
if ($method === 'DELETE') {
    $id = isset($_GET['id']) ? (int)$_GET['id'] : 0;
    if ($id <= 0) { json_response(['error' => 'Missing sticker id'], 400); }

    // Get the sticker URL to delete the file
    $stmt = $pdo->prepare('SELECT url FROM stickers WHERE id = ?');
    $stmt->execute([$id]);
    $sticker = $stmt->fetch();

    if ($sticker) {
        // Try to delete the physical file
        $filePath = __DIR__ . '/../../' . ltrim(str_replace(BASE_PATH, '', $sticker['url']), '/');
        if (file_exists($filePath)) {
            @unlink($filePath);
        }
    }

    $stmt = $pdo->prepare('DELETE FROM stickers WHERE id = ?');
    $stmt->execute([$id]);

    json_response(['ok' => true]);
}

json_response(['error' => 'Method not allowed'], 405);
