<?php
/**
 * PHP built-in server router for local testing.
 * Usage: php -S localhost:8080 test_router.php
 *
 * Routes /api/* requests to the correct PHP files,
 * and serves static files (uploads, etc.) directly.
 */

$uri = $_SERVER['REQUEST_URI'];
$path = parse_url($uri, PHP_URL_PATH);

// Remove base path prefix if present
$path = preg_replace('#^/wp/lefimovart#', '', $path);

// Serve static files from stickers/ and uploads/
if (preg_match('#^/stickers/(.+)$#', $path, $m)) {
    $file = __DIR__ . '/stickers/' . $m[1];
    if (file_exists($file)) {
        $mime = mime_content_type($file);
        header("Content-Type: $mime");
        readfile($file);
        return true;
    }
    http_response_code(404);
    echo json_encode(['error' => 'File not found']);
    return true;
}
if (preg_match('#^/uploads/(.+)$#', $path, $m)) {
    $file = __DIR__ . '/uploads/' . $m[1];
    if (file_exists($file)) {
        $mime = mime_content_type($file);
        header("Content-Type: $mime");
        readfile($file);
        return true;
    }
    http_response_code(404);
    echo json_encode(['error' => 'File not found']);
    return true;
}

// Route API requests
if (preg_match('#^/api/(.+\.php)#', $path, $m)) {
    $apiFile = __DIR__ . '/api/' . $m[1];
    if (file_exists($apiFile)) {
        // Override config.php with our local SQLite config
        // We do this by temporarily renaming config.php and putting our local one in its place
        require $apiFile;
        return true;
    }
    http_response_code(404);
    echo json_encode(['error' => 'API endpoint not found: ' . $m[1]]);
    return true;
}

// For anything else, return false to let the built-in server handle it
return false;
