<?php

/**
 * Fal.ai image generation helpers.
 * Supports FLUX.1 [dev], Nano Banana Pro, and GPT Image 2.
 */

function fal_generate_image(array $config, string $prompt, string $format, string $renderQuality, string $referenceImageUrl = ''): string {
    if (FAL_AI_API_KEY === '') {
        throw new RuntimeException('FAL.ai image generation is not configured.');
    }

    $is_edit = ($referenceImageUrl !== '' && !empty($config['supports_editing']));

    $payload = ['prompt' => $prompt];

    // Resolve size parameter from config
    $sizeParam = $config['size_param'] ?? 'image_size';
    $sizeValue = $config['size_map'][$format][$renderQuality]
              ?? $config['size_map']['1:1']['standard']
              ?? null;
    if ($sizeValue !== null) {
        $payload[$sizeParam] = $sizeValue;
    }

    // Add extra params (num_inference_steps, guidance_scale, quality, etc.)
    if (!empty($config['extra_params'])) {
        $payload = array_merge($payload, $config['extra_params']);
    }

    // HiRes-specific params (e.g., upscale for Nano Banana)
    if ($renderQuality === 'hires' && !empty($config['hires_params'])) {
        $payload = array_merge($payload, $config['hires_params']);
    }

    // Determine endpoint and add reference image params
    $endpoint = $config['api_endpoint'];

    if ($is_edit) {
        $fullImageUrl = fal_resolve_image_url($referenceImageUrl);

        // FLUX uses a separate image-to-image endpoint
        if (!empty($config['api_endpoint_i2i'])) {
            $endpoint = $config['api_endpoint_i2i'];
            $payload['image_url'] = $fullImageUrl;
            $payload['strength'] = 0.75;
        }
        // Nano Banana uses reference_images in the same endpoint
        elseif (strpos($endpoint, 'nano-banana') !== false) {
            $payload['reference_images'] = [
                ['image_url' => $fullImageUrl, 'task_type' => 'subject'],
            ];
        }
        // GPT Image 2 uses image_urls in the same endpoint
        elseif (strpos($endpoint, 'gpt-image') !== false) {
            $payload['image_urls'] = [$fullImageUrl];
        }
    }

    $ch = curl_init($endpoint);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST           => true,
        CURLOPT_POSTFIELDS     => json_encode($payload),
        CURLOPT_HTTPHEADER     => [
            'Content-Type: application/json',
            'Authorization: Key ' . FAL_AI_API_KEY,
        ],
        CURLOPT_TIMEOUT        => 180,
    ]);

    $response  = curl_exec($ch);
    $httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($httpCode < 200 || $httpCode >= 300 || !$response) {
        $result = json_decode((string)$response, true) ?: [];
        $msg = $result['detail'] ?? $result['error']['message'] ?? $curlError ?: 'Fal.ai image request failed.';
        throw new RuntimeException($msg);
    }

    $result = json_decode($response, true);
    $imageUrl = $result['images'][0]['url'] ?? '';
    if ($imageUrl === '') {
        throw new RuntimeException('Fal.ai did not return an image.');
    }

    return fal_download_image($imageUrl);
}

/**
 * Download image bytes from a remote URL.
 */
function fal_download_image(string $url): string {
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT        => 60,
    ]);
    $bytes     = curl_exec($ch);
    $httpCode  = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($httpCode < 200 || $httpCode >= 300 || $bytes === false || $bytes === '') {
        throw new RuntimeException('Failed to download generated image: ' . ($curlError ?: "HTTP $httpCode"));
    }
    return $bytes;
}

/**
 * Convert a relative image path to a full public URL for Fal.ai.
 */
function fal_resolve_image_url(string $path): string {
    if (strpos($path, 'http') === 0) {
        return $path;
    }
    return rtrim(APP_URL, '/') . $path;
}

/**
 * Look up credit cost for an image model + format + quality.
 */
function image_model_cost(array $config, string $format, string $renderQuality): int {
    return $config['cost_table'][$format][$renderQuality]
        ?? $config['cost_table']['1:1']['standard']
        ?? 4;
}
