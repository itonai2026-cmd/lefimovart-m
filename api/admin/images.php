<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/auth.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

$payload = require_auth();
$current_user = get_authenticated_user();
if (!$current_user) { json_response(['error' => 'Unauthorized'], 401); }
if (($current_user['role'] ?? 'user') !== 'admin') { json_response(['error' => 'Forbidden'], 403); }

global $pdo;

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $page = isset($_GET['page']) ? max(1, (int)$_GET['page']) : 1;
    $per_page = 15;
    $offset = ($page - 1) * $per_page;

    $count_stmt = $pdo->query('SELECT COUNT(*) FROM generated_images');
    $total = (int)$count_stmt->fetchColumn();

    $stmt = $pdo->prepare(
        'SELECT user_email, image_url, prompt, resolution, status, request_format, ip_address, created_at, model_used FROM generated_images ORDER BY created_at DESC LIMIT :limit OFFSET :offset'
    );
    $stmt->bindValue(':limit', $per_page, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();

    json_response([
        'ok' => true,
        'images' => $stmt->fetchAll(),
        'total' => $total,
        'page' => $page,
        'per_page' => $per_page,
        'total_pages' => (int)ceil($total / $per_page),
    ]);
}

json_response(['error' => 'Method not allowed'], 405);
