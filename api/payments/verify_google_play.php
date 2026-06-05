<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../includes/auth.php';
require_once __DIR__ . '/google_play_payment.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { json_response(['error' => 'Method not allowed'], 405); }

$payload = require_auth();
$user = get_authenticated_user();
if (!$user) { json_response(['error' => 'Unauthorized'], 401); }

$input = json_decode(file_get_contents('php://input'), true) ?: [];
$plan = $input['plan'] ?? '';
$product_id = $input['product_id'] ?? '';
$purchase_token = $input['purchase_token'] ?? '';
$order_id = $input['order_id'] ?? null;
$app_account_token = $input['app_account_token'] ?? null;

$result = process_google_play_purchase($user, $plan, $product_id, $purchase_token, $order_id, $app_account_token);
if (empty($result['ok'])) {
    json_response(['error' => $result['error'] ?? 'Google Play payment verification failed'], $result['status'] ?? 400);
}

json_response($result);
