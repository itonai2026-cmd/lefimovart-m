<?php

function google_play_base64url($value) {
    return rtrim(strtr(base64_encode($value), '+/', '-_'), '=');
}

function google_play_service_account() {
    $json = GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;

    if (empty($json) && !empty(GOOGLE_PLAY_SERVICE_ACCOUNT_FILE) && is_readable(GOOGLE_PLAY_SERVICE_ACCOUNT_FILE)) {
        $json = file_get_contents(GOOGLE_PLAY_SERVICE_ACCOUNT_FILE);
    }

    if (empty($json)) {
        return [null, 'Google Play service account is not configured'];
    }

    $account = json_decode($json, true);
    if (!$account || empty($account['client_email']) || empty($account['private_key'])) {
        return [null, 'Invalid Google Play service account JSON'];
    }

    return [$account, null];
}

function google_play_access_token() {
    [$account, $error] = google_play_service_account();
    if ($error) {
        return [null, $error];
    }

    $now = time();
    $header = ['alg' => 'RS256', 'typ' => 'JWT'];
    $claim = [
        'iss' => $account['client_email'],
        'scope' => 'https://www.googleapis.com/auth/androidpublisher',
        'aud' => 'https://oauth2.googleapis.com/token',
        'iat' => $now,
        'exp' => $now + 3600,
    ];

    $unsigned = google_play_base64url(json_encode($header)) . '.' . google_play_base64url(json_encode($claim));
    $signature = '';
    $ok = openssl_sign($unsigned, $signature, $account['private_key'], OPENSSL_ALGO_SHA256);
    if (!$ok) {
        return [null, 'Failed to sign Google Play service account JWT'];
    }

    $jwt = $unsigned . '.' . google_play_base64url($signature);

    $ch = curl_init('https://oauth2.googleapis.com/token');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => http_build_query([
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $jwt,
        ]),
        CURLOPT_TIMEOUT => 15,
    ]);
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $data = json_decode($response, true);
    if ($http_code !== 200 || empty($data['access_token'])) {
        error_log('Google Play OAuth failed: ' . $response);
        return [null, 'Google Play authentication failed'];
    }

    return [$data['access_token'], null];
}

function google_play_request($method, $path) {
    [$token, $error] = google_play_access_token();
    if ($error) {
        return [null, $error, 500];
    }

    $url = 'https://androidpublisher.googleapis.com/androidpublisher/v3/' . ltrim($path, '/');
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . $token,
            'Content-Type: application/json',
        ],
        CURLOPT_TIMEOUT => 15,
    ]);
    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $data = $response !== '' ? json_decode($response, true) : [];
    if ($http_code < 200 || $http_code >= 300) {
        error_log('Google Play API failed: ' . $response);
        return [null, 'Google Play purchase verification failed', $http_code ?: 500];
    }

    return [$data ?: [], null, $http_code];
}

function google_play_get_product_purchase($product_id, $purchase_token) {
    $path = sprintf(
        'applications/%s/purchases/products/%s/tokens/%s',
        rawurlencode(GOOGLE_PLAY_PACKAGE_NAME),
        rawurlencode($product_id),
        rawurlencode($purchase_token)
    );

    return google_play_request('GET', $path);
}

function google_play_consume_product_purchase($product_id, $purchase_token) {
    $path = sprintf(
        'applications/%s/purchases/products/%s/tokens/%s:consume',
        rawurlencode(GOOGLE_PLAY_PACKAGE_NAME),
        rawurlencode($product_id),
        rawurlencode($purchase_token)
    );

    return google_play_request('POST', $path);
}

function process_google_play_purchase($user, $plan, $product_id, $purchase_token, $order_id = null, $app_account_token = null) {
    global $pdo;

    if (!isset(PLAN_CREDITS[$plan])) {
        return ['error' => 'Invalid plan', 'status' => 400];
    }

    $expected_product_id = GOOGLE_PLAY_PRODUCT_IDS[$plan] ?? '';
    if (empty($expected_product_id)) {
        return ['error' => 'Google Play product is not configured for this plan', 'status' => 500];
    }

    if ($product_id !== $expected_product_id) {
        return ['error' => 'Google Play product does not match selected plan', 'status' => 400];
    }

    if (empty($purchase_token)) {
        return ['error' => 'Missing Google Play purchase token', 'status' => 400];
    }

    [$purchase, $error, $status] = google_play_get_product_purchase($product_id, $purchase_token);
    if ($error) {
        return ['error' => $error, 'status' => $status];
    }

    if ((int)($purchase['purchaseState'] ?? -1) !== 0) {
        return ['error' => 'Google Play purchase is not completed', 'status' => 400];
    }

    if (($purchase['productId'] ?? $product_id) !== $product_id) {
        return ['error' => 'Google Play purchase product mismatch', 'status' => 400];
    }

    $google_account = $purchase['obfuscatedExternalAccountId'] ?? null;
    if ($app_account_token && $google_account && !hash_equals($app_account_token, $google_account)) {
        return ['error' => 'Google Play purchase account mismatch', 'status' => 403];
    }

    $session_id = 'googleplay:' . hash('sha256', $purchase_token);
    $credits = PLAN_CREDITS[$plan];
    $amount_eur = PLAN_PRICES_CENTS[$plan] / 100;

    $stmt = $pdo->prepare('SELECT plan, credits_added FROM processed_payments WHERE session_id = ?');
    $stmt->execute([$session_id]);
    $processed_payment = $stmt->fetch();
    if ($processed_payment) {
        if ((int)($purchase['consumptionState'] ?? 0) === 0) {
            google_play_consume_product_purchase($product_id, $purchase_token);
        }

        return [
            'ok' => true,
            'already_processed' => true,
            'message' => 'Already processed',
            'credits' => (int)$processed_payment['credits_added'],
            'plan' => $processed_payment['plan'],
        ];
    }

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
            $user['id'],
            $user['email'],
            $session_id,
            $plan,
            $credits,
            $amount_eur,
            null,
            $order_id ?: ($purchase['orderId'] ?? null),
        ]);

        $stmt = $pdo->prepare('UPDATE users SET credits = credits + ? WHERE id = ?');
        $stmt->execute([$credits, $user['id']]);

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        error_log('Google Play payment processing failed: ' . $e->getMessage());
        return ['error' => 'Failed to process Google Play payment', 'status' => 500];
    }

    [$consume_result, $consume_error] = google_play_consume_product_purchase($product_id, $purchase_token);

    return [
        'ok' => true,
        'credits' => $credits,
        'plan' => $plan,
        'consume_warning' => $consume_error ?: null,
    ];
}
