<?php
/**
 * Best-effort poster (cover frame) generation for videos.
 *
 * The video gallery shows a static poster per clip instead of mounting a live
 * <video> for every item, which keeps mobile memory/decoder usage low. A poster
 * can come from two sources, in order of preference:
 *   1. a thumbnail URL returned by the provider (Fal.ai), downloaded locally;
 *   2. the first frame of the locally stored video, extracted via ffmpeg.
 *
 * Everything here is best-effort: if no thumbnail is provided and ffmpeg is
 * unavailable (or shell execution is disabled by the host), the functions
 * return null and the frontend simply falls back to a lightweight placeholder.
 */

function video_storage_dir(): string {
    $dir = realpath(__DIR__ . '/../..');
    $dir = ($dir !== false ? $dir : (__DIR__ . '/../..')) . '/vid';
    if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
        throw new RuntimeException('Video storage is unavailable.');
    }
    return $dir;
}

/** Locate an ffmpeg binary, or null if shell exec / ffmpeg is unavailable. */
function ffmpeg_binary(): ?string {
    $configured = getenv('FFMPEG_BIN');
    if ($configured && is_executable($configured)) {
        return $configured;
    }
    if (!function_exists('shell_exec')) {
        return null;
    }
    $disabled = array_map('trim', explode(',', (string)ini_get('disable_functions')));
    if (in_array('shell_exec', $disabled, true)) {
        return null;
    }
    $found = @shell_exec('command -v ffmpeg 2>/dev/null');
    $found = is_string($found) ? trim($found) : '';
    if ($found !== '' && is_executable($found)) {
        return $found;
    }
    foreach (['/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg', '/opt/bin/ffmpeg'] as $candidate) {
        if (is_executable($candidate)) {
            return $candidate;
        }
    }
    return null;
}

/** Extract the first frame of a local video to a JPEG poster. Returns public URL or null. */
function generate_video_poster_from_file(string $localVideoPath, int $videoId, int $width = 512): ?string {
    if (!is_file($localVideoPath)) {
        return null;
    }
    $ffmpeg = ffmpeg_binary();
    if ($ffmpeg === null) {
        return null;
    }
    try {
        $dir = video_storage_dir();
    } catch (RuntimeException $e) {
        return null;
    }
    $posterName = 'poster_' . $videoId . '_' . time() . '.jpg';
    $posterPath = $dir . '/' . $posterName;

    $cmd = escapeshellarg($ffmpeg)
        . ' -y -ss 0 -i ' . escapeshellarg($localVideoPath)
        . ' -frames:v 1 -vf ' . escapeshellarg('scale=' . (int)$width . ':-2')
        . ' ' . escapeshellarg($posterPath) . ' 2>/dev/null';
    @shell_exec($cmd);

    if (is_file($posterPath) && filesize($posterPath) > 0) {
        return BASE_PATH . '/vid/' . $posterName;
    }
    return null;
}

/** Download a provider-supplied thumbnail URL to a local poster. Returns public URL or null. */
function download_video_poster(string $thumbnailUrl, int $videoId): ?string {
    if ($thumbnailUrl === '' || strpos($thumbnailUrl, 'http') !== 0) {
        return null;
    }
    try {
        $dir = video_storage_dir();
    } catch (RuntimeException $e) {
        return null;
    }
    $ch = curl_init($thumbnailUrl);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_TIMEOUT        => 30,
    ]);
    $bytes = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    if ($code < 200 || $code >= 300 || $bytes === false || strlen($bytes) === 0) {
        return null;
    }
    $posterName = 'poster_' . $videoId . '_' . time() . '.jpg';
    if (file_put_contents($dir . '/' . $posterName, $bytes) === false) {
        return null;
    }
    return BASE_PATH . '/vid/' . $posterName;
}
