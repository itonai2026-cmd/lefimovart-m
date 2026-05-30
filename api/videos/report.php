<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/auth.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { json_response(['error' => 'Method not allowed'], 405); }

$payload = require_auth();
$user = get_authenticated_user();
if (!$user) { json_response(['error' => 'Unauthorized'], 401); }

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$id = (int)($input['id'] ?? 0);
$reason = trim((string)($input['flagged_reason'] ?? ''));
$allowed = [
    'Offensive content',
    'Sexual content / NSFW',
    'Violence',
    'Child abuse',
    'Hate speech',
    'Other',
];

if ($id < 1 || !in_array($reason, $allowed, true)) {
    json_response(['ok' => false, 'error' => 'Invalid report.'], 400);
}

global $pdo;

$check = $pdo->prepare('SELECT id FROM videos WHERE id = ? AND user_email = ? LIMIT 1');
$check->execute([$id, $user['email']]);
$video = $check->fetch();

if (!$video) {
    json_response(['ok' => false, 'error' => 'Video not found.'], 404);
}

$stmt = $pdo->prepare('UPDATE videos SET flagged = 1, flagged_reason = ? WHERE id = ?');
$stmt->execute([$reason, $video['id']]);

json_response(['ok' => true, 'id' => (int)$video['id'], 'flagged' => 1, 'flagged_reason' => $reason]);
