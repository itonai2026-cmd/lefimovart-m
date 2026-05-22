<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/jwt.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { json_response(['error' => 'Method not allowed'], 405); }

if (empty(STRIPE_SECRET_KEY)) {
    json_response(['error' => 'Stripe not configured'], 500);
}

$input = json_decode(file_get_contents('php://input'), true);
$session_id = $input['session_id'] ?? '';
$plan = $input['plan'] ?? '';

if (empty($session_id) || !preg_match('/^cs_/', $session_id)) {
    json_response(['error' => 'Invalid session ID'], 400);
}

if (!isset(PLAN_CREDITS[$plan])) {
    json_response(['error' => 'Invalid plan'], 400);
}

global $pdo;

// Check if already processed
$stmt = $pdo->prepare('SELECT id FROM processed_payments WHERE session_id = ?');
$stmt->execute([$session_id]);
if ($stmt->fetch()) {
    json_response(['ok' => true, 'message' => 'Already processed']);
}

// Verify with Stripe
$ch = curl_init('https://api.stripe.com/v1/checkout/sessions/' . urlencode($session_id));
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HTTPAUTH => CURLAUTH_BASIC,
    CURLOPT_USERPWD => STRIPE_SECRET_KEY . ':',
    CURLOPT_TIMEOUT => 10
]);
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($http_code !== 200) {
    json_response(['error' => 'Stripe verification failed'], 400);
}

$session = json_decode($response, true);
if ($session['payment_status'] !== 'paid' || $session['status'] !== 'complete') {
    json_response(['error' => 'Payment not completed'], 400);
}

// Get user email and add credits
$email = $session['customer_email'] ?? $session['client_reference_id'] ?? '';
if (empty($email)) {
    json_response(['error' => 'No email found'], 400);
}

$credits = PLAN_CREDITS[$plan];

// Save payment record
$stmt = $pdo->prepare('INSERT INTO processed_payments (user_email, session_id, plan, credits_added) VALUES (?, ?, ?, ?)');
$stmt->execute([$email, $session_id, $plan, $credits]);

// Add credits to user
$stmt = $pdo->prepare('UPDATE users SET credits = credits + ? WHERE email = ?');
$stmt->execute([$credits, $email]);

json_response(['ok' => true, 'credits' => $credits]);
