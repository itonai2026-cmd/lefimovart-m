<?php

function openai_image_model(): string {
    return defined('OPENAI_IMAGE_MODEL') ? OPENAI_IMAGE_MODEL : 'gpt-image-1.5';
}

function openai_api_key(): string {
    $key = getenv('OPENAI_API_KEY') ?: '';
    if ($key === '') {
        throw new RuntimeException('OpenAI image generation is not configured.');
    }
    return $key;
}

function openai_extract_image_bytes(array $result): string {
    $encoded = $result['data'][0]['b64_json'] ?? '';
    if ($encoded === '') {
        $message = $result['error']['message'] ?? 'OpenAI did not return an image.';
        throw new RuntimeException($message);
    }

    $bytes = base64_decode($encoded, true);
    if ($bytes === false) {
        throw new RuntimeException('OpenAI returned invalid image data.');
    }
    return $bytes;
}

function openai_generate_image(string $prompt, string $quality): string {
    $payload = [
        'model' => openai_image_model(),
        'prompt' => $prompt,
        'size' => '1024x1024',
        'quality' => $quality,
    ];

    $ch = curl_init('https://api.openai.com/v1/images/generations');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . openai_api_key(),
        ],
        CURLOPT_TIMEOUT => 150,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    $result = json_decode((string)$response, true) ?: [];
    if ($httpCode < 200 || $httpCode >= 300) {
        throw new RuntimeException($result['error']['message'] ?? $curlError ?: 'OpenAI image request failed.');
    }
    return openai_extract_image_bytes($result);
}

function openai_edit_image(string $imagePath, string $prompt): string {
    if (!is_file($imagePath)) {
        throw new RuntimeException('Source image could not be found.');
    }

    $ch = curl_init('https://api.openai.com/v1/images/edits');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => [
            'model' => openai_image_model(),
            'image' => new CURLFile($imagePath),
            'prompt' => $prompt,
            'size' => '1024x1024',
            'quality' => 'medium',
            'input_fidelity' => 'high',
        ],
        CURLOPT_HTTPHEADER => [
            'Authorization: Bearer ' . openai_api_key(),
        ],
        CURLOPT_TIMEOUT => 150,
    ]);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    $result = json_decode((string)$response, true) ?: [];
    if ($httpCode < 200 || $httpCode >= 300) {
        throw new RuntimeException($result['error']['message'] ?? $curlError ?: 'OpenAI image edit request failed.');
    }
    return openai_extract_image_bytes($result);
}

function image_storage_dir(): string {
    $dir = __DIR__ . '/../../img';
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        throw new RuntimeException('Image storage is unavailable.');
    }
    return $dir;
}

function save_image_bytes(string $bytes, string $prefix): string {
    $filename = uniqid($prefix, true) . '.png';
    $filepath = image_storage_dir() . '/' . $filename;
    if (file_put_contents($filepath, $bytes) === false) {
        throw new RuntimeException('Failed to store generated image.');
    }
    return BASE_PATH . '/img/' . $filename;
}

function local_image_path(string $url): string {
    $path = parse_url($url, PHP_URL_PATH) ?: '';
    $prefix = BASE_PATH . '/img/';
    if (strpos($path, $prefix) !== 0) {
        throw new RuntimeException('Only uploaded LefiMovArt images can be edited.');
    }

    $filename = basename($path);
    $fullPath = image_storage_dir() . '/' . $filename;
    if (!is_file($fullPath)) {
        throw new RuntimeException('Source image could not be found.');
    }
    return $fullPath;
}
