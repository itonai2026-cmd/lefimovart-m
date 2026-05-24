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
$imageUrl = trim((string)($input['image_url'] ?? ''));
$flagged = trim((string)($input['flagged'] ?? ''));
$allowed = [
    'Offensive content',
    'Sexual content / NSFW',
    'Violence',
    'Child abuse',
    'Hate speech',
    'Other',
];

if (($id < 1 && $imageUrl === '') || !in_array($flagged, $allowed, true)) {
    json_response(['ok' => false, 'error' => 'Invalid report.'], 400);
}

global $pdo;
ensure_generated_images_flagged_column($pdo);

$identityWhere = $id > 0
    ? '(id = ? OR image_url = ?)'
    : 'image_url = ?';
$identityParams = $id > 0 ? [$id, $imageUrl] : [$imageUrl];
$ownerWhere = '(user_id = ? OR user_email = ?)';

$check = $pdo->prepare("SELECT id FROM generated_images WHERE {$identityWhere} AND {$ownerWhere} LIMIT 1");
$check->execute([...$identityParams, $user['id'], $user['email']]);
$image = $check->fetch();

if (!$image) {
    json_response(['ok' => false, 'error' => 'Image not found.'], 404);
}

$stmt = $pdo->prepare('UPDATE generated_images SET flagged = ? WHERE id = ?');
$stmt->execute([$flagged, $image['id']]);

json_response(['ok' => true, 'id' => (int)$image['id'], 'flagged' => $flagged]);
