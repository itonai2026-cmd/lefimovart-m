<?php
function stripe_get_checkout_session($session_id) {
    $stripe_url = 'https://api.stripe.com/v1/checkout/sessions/' . urlencode($session_id) . '?' . http_build_query([
        'expand' => ['line_items.data.price'],
    ]);

    $ch = curl_init($stripe_url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPAUTH => CURLAUTH_BASIC,
        CURLOPT_USERPWD => STRIPE_SECRET_KEY . ':',
        CURLOPT_TIMEOUT => 10,
    ]);
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($http_code !== 200) {
        return [null, 'Stripe verification failed'];
    }

    return [json_decode($response, true), null];
}

function process_paid_checkout_session($session, $authenticated_email = null) {
    global $pdo;

    if (($session['payment_status'] ?? '') !== 'paid' || ($session['status'] ?? '') !== 'complete') {
        return ['error' => 'Payment not completed', 'status' => 400];
    }

    $plan = $session['metadata']['plan'] ?? '';
    if (!isset(PLAN_CREDITS[$plan])) {
        return ['error' => 'Invalid Stripe session plan', 'status' => 400];
    }

    $expected_price_id = PLAN_PRICE_IDS[$plan] ?? '';
    if (empty($expected_price_id)) {
        return ['error' => 'Stripe price is not configured for this plan', 'status' => 500];
    }

    $line_items = $session['line_items']['data'] ?? [];
    $paid_price_id = $line_items[0]['price']['id'] ?? '';
    if ($paid_price_id !== $expected_price_id) {
        return ['error' => 'Stripe price does not match selected plan', 'status' => 400];
    }

    $paid_currency = strtolower($session['currency'] ?? ($line_items[0]['price']['currency'] ?? ''));
    if ($paid_currency !== PLAN_CURRENCY) {
        return ['error' => 'Stripe currency does not match selected plan', 'status' => 400];
    }

    if ((int)($session['amount_total'] ?? 0) !== PLAN_PRICES_CENTS[$plan]) {
        return ['error' => 'Stripe amount does not match selected plan', 'status' => 400];
    }

    $email = $session['customer_email'] ?? $session['client_reference_id'] ?? '';
    if (empty($email)) {
        return ['error' => 'No email found', 'status' => 400];
    }

    if ($authenticated_email !== null && strtolower($email) !== strtolower($authenticated_email)) {
        return ['error' => 'Payment does not belong to authenticated user', 'status' => 403];
    }

    $session_id = $session['id'] ?? '';
    if (empty($session_id)) {
        return ['error' => 'Invalid Stripe session', 'status' => 400];
    }

    $stmt = $pdo->prepare('SELECT plan, credits_added FROM processed_payments WHERE session_id = ?');
    $stmt->execute([$session_id]);
    $processed_payment = $stmt->fetch();
    if ($processed_payment) {
        return [
            'ok' => true,
            'already_processed' => true,
            'message' => 'Already processed',
            'credits' => (int)$processed_payment['credits_added'],
            'plan' => $processed_payment['plan'],
        ];
    }

    $user_stmt = $pdo->prepare('SELECT id FROM users WHERE email = ?');
    $user_stmt->execute([$email]);
    $user_row = $user_stmt->fetch();
    if (!$user_row) {
        return ['error' => 'User not found', 'status' => 400];
    }

    $credits = PLAN_CREDITS[$plan];
    $amount_eur = PLAN_PRICES_CENTS[$plan] / 100;

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare('SELECT plan, credits_added FROM processed_payments WHERE session_id = ? FOR UPDATE');
        $stmt->execute([$session_id]);
        $processed_payment = $stmt->fetch();
        if ($processed_payment) {
            $pdo->commit();
            return [
                'ok' => true,
                'already_processed' => true,
                'message' => 'Already processed',
                'credits' => (int)$processed_payment['credits_added'],
                'plan' => $processed_payment['plan'],
            ];
        }

        $stmt = $pdo->prepare('INSERT INTO processed_payments (user_id, user_email, session_id, plan, credits_added, amount_usd, stripe_customer_id, stripe_payment_intent_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
        $stmt->execute([
            $user_row['id'],
            $email,
            $session_id,
            $plan,
            $credits,
            $amount_eur,
            $session['customer'] ?? null,
            $session['payment_intent'] ?? null,
        ]);

        $stmt = $pdo->prepare('UPDATE users SET credits = credits + ? WHERE email = ?');
        $stmt->execute([$credits, $email]);

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('Stripe payment processing failed: ' . $e->getMessage());
        return ['error' => 'Failed to process payment', 'status' => 500];
    }

    return ['ok' => true, 'credits' => $credits, 'plan' => $plan];
}
