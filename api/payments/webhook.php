<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/stripe_payment.php';

function stripe_webhook_error($message, $status = 400) {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    exit(json_encode(['error' => $message]));
}

function verify_stripe_webhook_signature($payload, $signature_header, $secret) {
    if (empty($signature_header) || empty($secret)) {
        return false;
    }

    $timestamp = null;
    $signatures = [];
    foreach (explode(',', $signature_header) as $part) {
        list($key, $value) = array_pad(explode('=', trim($part), 2), 2, '');
        if ($key === 't') {
            $timestamp = $value;
        } elseif ($key === 'v1') {
            $signatures[] = $value;
        }
    }

    if (!$timestamp || empty($signatures)) {
        return false;
    }

    if (abs(time() - (int)$timestamp) > 300) {
        return false;
    }

    $expected = hash_hmac('sha256', $timestamp . '.' . $payload, $secret);
    foreach ($signatures as $signature) {
        if (hash_equals($expected, $signature)) {
            return true;
        }
    }

    return false;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    stripe_webhook_error('Method not allowed', 405);
}

if (empty(STRIPE_SECRET_KEY) || empty(STRIPE_ENDPOINT_SECRET)) {
    stripe_webhook_error('Stripe webhook not configured', 500);
}

$payload = file_get_contents('php://input');
$signature_header = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';
if (!verify_stripe_webhook_signature($payload, $signature_header, STRIPE_ENDPOINT_SECRET)) {
    stripe_webhook_error('Invalid Stripe signature', 400);
}

$event = json_decode($payload, true);
if (!is_array($event)) {
    stripe_webhook_error('Invalid Stripe payload', 400);
}

if (($event['type'] ?? '') === 'checkout.session.completed') {
    $session_id = $event['data']['object']['id'] ?? '';
    if (empty($session_id)) {
        stripe_webhook_error('Invalid checkout session', 400);
    }

    [$session, $error] = stripe_get_checkout_session($session_id);
    if ($error) {
        stripe_webhook_error($error, 400);
    }

    $result = process_paid_checkout_session($session);
    if (empty($result['ok'])) {
        stripe_webhook_error($result['error'] ?? 'Payment processing failed', $result['status'] ?? 400);
    }
}

http_response_code(200);
header('Content-Type: application/json; charset=utf-8');
echo json_encode(['ok' => true]);
