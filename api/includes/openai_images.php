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

function openai_generate_image(string $prompt, string $quality, string $size): string {
    $payload = [
        'model' => openai_image_model(),
        'prompt' => $prompt,
        'size' => $size,
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

function openai_edit_image(string $imagePath, string $prompt, string $size = '1024x1024'): string {
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
            'size' => $size,
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

function render_image_dimensions(string $bytes, int $targetWidth, int $targetHeight): string {
    if (!function_exists('imagecreatefromstring')) {
        throw new RuntimeException('HiRes and cinema formats require the PHP GD extension on the server.');
    }

    $source = imagecreatefromstring($bytes);
    if ($source === false) {
        throw new RuntimeException('Generated image could not be processed.');
    }

    $sourceWidth = imagesx($source);
    $sourceHeight = imagesy($source);
    $sourceRatio = $sourceWidth / $sourceHeight;
    $targetRatio = $targetWidth / $targetHeight;

    if ($sourceRatio > $targetRatio) {
        $cropHeight = $sourceHeight;
        $cropWidth = (int)round($sourceHeight * $targetRatio);
        $cropX = (int)floor(($sourceWidth - $cropWidth) / 2);
        $cropY = 0;
    } else {
        $cropWidth = $sourceWidth;
        $cropHeight = (int)round($sourceWidth / $targetRatio);
        $cropX = 0;
        $cropY = (int)floor(($sourceHeight - $cropHeight) / 2);
    }

    $output = imagecreatetruecolor($targetWidth, $targetHeight);
    imagealphablending($output, false);
    imagesavealpha($output, true);
    $transparent = imagecolorallocatealpha($output, 0, 0, 0, 127);
    imagefilledrectangle($output, 0, 0, $targetWidth, $targetHeight, $transparent);
    imagecopyresampled(
        $output,
        $source,
        0,
        0,
        $cropX,
        $cropY,
        $targetWidth,
        $targetHeight,
        $cropWidth,
        $cropHeight
    );

    ob_start();
    imagepng($output);
    $rendered = ob_get_clean();
    imagedestroy($output);
    imagedestroy($source);

    if ($rendered === false) {
        throw new RuntimeException('Failed to render final image.');
    }
    return $rendered;
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

function image_thumbs_dir(): string {
    $dir = image_storage_dir() . '/thumbs';
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        throw new RuntimeException('Thumbnail storage is unavailable.');
    }
    return $dir;
}

/**
 * Downscale raw image bytes to a small JPEG suitable for gallery grids.
 * Returns null (instead of throwing) when GD is missing or the source can't
 * be decoded, so callers can fall back to the full-size image.
 */
function make_image_thumbnail_bytes(string $bytes, int $width = 512): ?string {
    if (!function_exists('imagecreatefromstring')) {
        return null;
    }
    $source = @imagecreatefromstring($bytes);
    if ($source === false) {
        return null;
    }
    $sourceWidth = imagesx($source);
    $sourceHeight = imagesy($source);
    if ($sourceWidth < 1 || $sourceHeight < 1) {
        imagedestroy($source);
        return null;
    }

    $targetWidth = min($width, $sourceWidth);
    $targetHeight = (int)max(1, round($sourceHeight * ($targetWidth / $sourceWidth)));

    $output = imagecreatetruecolor($targetWidth, $targetHeight);
    $white = imagecolorallocate($output, 255, 255, 255);
    imagefilledrectangle($output, 0, 0, $targetWidth, $targetHeight, $white);
    imagecopyresampled(
        $output,
        $source,
        0, 0, 0, 0,
        $targetWidth, $targetHeight,
        $sourceWidth, $sourceHeight
    );

    ob_start();
    $ok = imagejpeg($output, null, 82);
    $data = ob_get_clean();
    imagedestroy($output);
    imagedestroy($source);

    return ($ok && $data !== false && $data !== '') ? $data : null;
}

/**
 * Build (and persist) a thumbnail for an already-saved image. The thumbnail
 * filename matches the on-the-fly thumb.php cache convention
 * (thumbs/<width>_<mainFilename>.jpg) so both paths share one cached file.
 * Returns the public thumbnail URL, or null on failure.
 */
function save_image_thumbnail(string $bytes, string $mainFilename, int $width = 512): ?string {
    $data = make_image_thumbnail_bytes($bytes, $width);
    if ($data === null) {
        return null;
    }
    try {
        $dir = image_thumbs_dir();
    } catch (RuntimeException $e) {
        return null;
    }
    $thumbName = $width . '_' . basename($mainFilename) . '.jpg';
    if (file_put_contents($dir . '/' . $thumbName, $data) === false) {
        return null;
    }
    return BASE_PATH . '/img/thumbs/' . $thumbName;
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
