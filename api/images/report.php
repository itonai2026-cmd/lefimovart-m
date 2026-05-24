<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/../includes/generated_images.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { json_response(['error' => 'Method not allowed'], 405); }

$payload = require_auth();
$user = get_authenticated_user();
if (!$user) { json_response(['error' => 'Unauthorized'], 401); }

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$id = (int)($input['id'] ?? 0);
$flagged = trim((string)($input['flagged'] ?? ''));
$allowed = [
    'Offensive content',
    'Sexual content / NSFW',
    'Violence',
    'Child abuse',
    'Hate speech',
    'Other',
];

if ($id < 1 || !in_array($flagged, $allowed, true)) {
    json_response(['ok' => false, 'error' => 'Invalid report.'], 400);
}

global $pdo;
ensure_generated_images_flagged_column($pdo);

$stmt = $pdo->prepare('UPDATE generated_images SET flagged = ? WHERE id = ? AND user_email = ?');
$stmt->execute([$flagged, $id, $user['email']]);

if ($stmt->rowCount() !== 1) {
    json_response(['ok' => false, 'error' => 'Image not found.'], 404);
}

json_response(['ok' => true, 'id' => $id, 'flagged' => $flagged]);
