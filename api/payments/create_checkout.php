<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/auth.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { json_response(['error' => 'Method not allowed'], 405); }

if (empty(STRIPE_SECRET_KEY)) {
    json_response(['error' => 'Stripe not configured'], 500);
}

$payload = require_auth();
$user = get_authenticated_user();
if (!$user) { json_response(['error' => 'Unauthorized'], 401); }

$input = json_decode(file_get_contents('php://input'), true);
$plan = $input['plan'] ?? '';

if (!isset(PLAN_CREDITS[$plan])) {
    json_response(['error' => 'Invalid plan'], 400);
}

$plan_names = ['bronze' => 'Bronze', 'silver' => 'Silver', 'gold' => 'Gold'];

$checkout_data = http_build_query([
    'payment_method_types[0]' => 'card',
    'mode' => 'payment',
    'customer_email' => $user['email'],
    'client_reference_id' => $user['email'],
    'line_items[0][price_data][currency]' => 'usd',
    'line_items[0][price_data][product_data][name]' => 'LefiMovArt ' . ($plan_names[$plan] ?? $plan) . ' Plan',
    'line_items[0][price_data][product_data][description]' => PLAN_CREDITS[$plan] . ' credits',
    'line_items[0][price_data][unit_amount]' => PLAN_PRICES_USD[$plan],
    'line_items[0][quantity]' => 1,
    'success_url' => rtrim(APP_URL, '/') . BASE_PATH . '/buy-credits?session_id={CHECKOUT_SESSION_ID}&plan=' . $plan,
    'cancel_url' => rtrim(APP_URL, '/') . BASE_PATH . '/buy-credits',
    'metadata[plan]' => $plan,
    'metadata[user_email]' => $user['email'],
]);

$ch = curl_init('https://api.stripe.com/v1/checkout/sessions');
curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $checkout_data,
    CURLOPT_HTTPAUTH => CURLAUTH_BASIC,
    CURLOPT_USERPWD => STRIPE_SECRET_KEY . ':',
    CURLOPT_TIMEOUT => 10
]);
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($http_code !== 200) {
    error_log('Stripe checkout creation failed: ' . $response);
    json_response(['error' => 'Failed to create checkout session'], 500);
}

$session = json_decode($response, true);

json_response([
    'ok' => true,
    'checkout_url' => $session['url'],
    'session_id' => $session['id']
]);
