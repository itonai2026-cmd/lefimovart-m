<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/stripe_payment.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { json_response(['error' => 'Method not allowed'], 405); }

if (empty(STRIPE_SECRET_KEY)) {
    json_response(['error' => 'Stripe not configured'], 500);
}

$input = json_decode(file_get_contents('php://input'), true);
$session_id = $input['session_id'] ?? '';

if (empty($session_id) || !preg_match('/^cs_/', $session_id)) {
    json_response(['error' => 'Invalid session ID'], 400);
}

$payload = require_auth();
$authenticated_user = get_authenticated_user();
if (!$authenticated_user) { json_response(['error' => 'Unauthorized'], 401); }

[$session, $error] = stripe_get_checkout_session($session_id);
if ($error) {
    json_response(['error' => $error], 400);
}

$result = process_paid_checkout_session($session, $authenticated_user['email']);
if (empty($result['ok'])) {
    json_response(['error' => $result['error'] ?? 'Payment verification failed'], $result['status'] ?? 400);
}

json_response($result);
