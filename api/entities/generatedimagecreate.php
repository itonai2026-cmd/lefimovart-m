<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/jwt.php';
require_once __DIR__ . '/../includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
    exit;
}

$user = authenticateRequest();
if (!$user) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Unauthorized']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

try {
    $stmt = $pdo->prepare('
        INSERT INTO generated_images (user_email, image_url, prompt, created_at)
        VALUES (:user_email, :image_url, :prompt, :created_at)
    ');
    
    $stmt->execute([
        ':user_email' => $user['email'],
        ':image_url' => $data['image_url'] ?? '',
        ':prompt' => $data['prompt'] ?? '',
        ':created_at' => date('Y-m-d H:i:s')
    ]);

    $id = $pdo->lastInsertId();
    
    echo json_encode([
        'ok' => true,
        'id' => $id,
        'user_email' => $user['email'],
        'image_url' => $data['image_url'] ?? '',
        'prompt' => $data['prompt'] ?? '',
        'created_at' => date('Y-m-d H:i:s')
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Create failed: ' . $e->getMessage()]);
}
