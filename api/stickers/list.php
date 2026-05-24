<?php
/**
 * GET /api/stickers/list.php
 * Returns all stickers ordered by newest first.
 * Requires authentication (any logged-in user).
 */
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/jwt.php';
require_once __DIR__ . '/../includes/auth.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'GET') { json_response(['error' => 'Method not allowed'], 405); }

$payload = require_auth();

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

$stmt = $pdo->query('SELECT id, name, url, category, created_at FROM stickers ORDER BY created_at DESC LIMIT 500');
json_response(['ok' => true, 'stickers' => $stmt->fetchAll()]);
