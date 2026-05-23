<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: DELETE, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/jwt.php';
require_once __DIR__ . '/../includes/auth.php';

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

$user = authenticateRequest();
if (!$user) {
    http_response_code(401);
    echo json_encode(['ok' => false, 'error' => 'Unauthorized']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);
$imageId = $data['id'] ?? null;

if (!$imageId) {
    http_response_code(400);
    echo json_encode(['ok' => false, 'error' => 'No image ID provided']);
    exit;
}

try {
    // Verify ownership before deleting
    $checkStmt = $pdo->prepare('SELECT id FROM generated_images WHERE id = :id AND user_email = :email');
    $checkStmt->execute([':id' => $imageId, ':email' => $user['email']]);
    
    if (!$checkStmt->fetch()) {
        http_response_code(403);
        echo json_encode(['ok' => false, 'error' => 'Image not found or not owned by user']);
        exit;
    }

    $stmt = $pdo->prepare('DELETE FROM generated_images WHERE id = :id');
    $stmt->execute([':id' => $imageId]);

    echo json_encode(['ok' => true, 'id' => $imageId]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['ok' => false, 'error' => 'Delete failed: ' . $e->getMessage()]);
}
