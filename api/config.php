<?php
/**
 * LefiMovArt - Global Configuration
 * Database, Session, Constants, CORS
 */

// ─── ENV Parser ───────────────────────────────────────────────────────────
if (file_exists(__DIR__ . '/../.env')) {
    $lines = file(__DIR__ . '/../.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') === false) continue;
        list($name, $value) = explode('=', $line, 2);
        $name = trim($name);
        $value = trim($value);
        if (!empty($name) && !array_key_exists($name, $_SERVER)) {
            putenv("{$name}={$value}");
            $_ENV[$name] = $value;
            $_SERVER[$name] = $value;
        }
    }
}

// ─── Error Reporting ──────────────────────────────────────────────────────
ini_set('display_errors', getenv('APP_ENV') === 'production' ? 0 : 1);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// ─── Session ──────────────────────────────────────────────────────────────
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', 1);
    ini_set('session.cookie_secure', getenv('APP_ENV') === 'production' ? 1 : 0);
    ini_set('session.use_strict_mode', 1);
    ini_set('session.cookie_samesite', 'Lax');
    session_start();
}

// ─── Database ─────────────────────────────────────────────────────────────
define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_NAME', getenv('DB_NAME') ?: 'ai_video');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');

try {
    $pdo = new PDO(
        'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES   => false,
        ]
    );
} catch (PDOException $e) {
    error_log('DB connection failed: ' . $e->getMessage());
    http_response_code(500);
    exit(json_encode(['error' => 'Database connection failed']));
}

// ─── App Constants ────────────────────────────────────────────────────────
define('APP_NAME', 'LefiMovArt');
define('APP_URL', getenv('APP_URL') ?: 'http://localhost');
define('BASE_PATH', getenv('BASE_PATH') !== false ? rtrim(getenv('BASE_PATH'), '/') : '/wp/lefimovart');
define('UPLOAD_DIR', __DIR__ . '/../uploads/');
define('MAX_UPLOAD_SIZE', 50 * 1024 * 1024); // 50 MB
define('JWT_SECRET', getenv('JWT_SECRET') ?: 'unsafe_default_key_change_me');
define('JWT_EXPIRE', 86400 * 7); // 7 days

// ─── AI APIs ──────────────────────────────────────────────────────────────
define('OPENAI_API_KEY', getenv('OPENAI_API_KEY') ?: '');
define('OPENAI_IMAGE_MODEL', getenv('OPENAI_IMAGE_MODEL') ?: 'gpt-image-1.5');
define('FAL_AI_API_KEY', getenv('FAL_AI_API_KEY') ?: '');
define('FAL_AI_BASE_URL', 'https://queue.fal.run');

// ─── Video Models ─────────────────────────────────────────────────────────
// cost_table: credits indexed by [resolution][duration_seconds]
// Prices derived from Fal.ai per-second / per-video rates
// Kling O3 Std  $0.084/sec (no audio)
// Wan 2.7       $0.10/sec @720p, $0.15/sec @1080p
// Kling 2.5 Pro $0.35/5s, +$0.07/sec after
$MODELS_CONFIG = [
    'kling_o3' => [
        'name'             => 'Kling O3 Standard',
        'description'      => 'Latest Kling model with realistic motion and multi-shot support. Great value.',
        'tier'             => 'low',
        'api_endpoint'     => 'https://queue.fal.run/fal-ai/kling-video/o3/standard/text-to-video',
        'api_endpoint_i2v' => 'https://queue.fal.run/fal-ai/kling-video/o3/standard/image-to-video',
        'aspect_ratios'    => ['16:9', '9:16', '1:1'],
        'resolutions'      => ['default'],
        'duration_param'   => 'duration',
        'duration_map'     => [4 => '4', 6 => '6', 8 => '8', 10 => '10'],
        'fps_default'      => null,
        'extra_params'     => [],
        'cost_table'       => [
            'default' => [4 => 3, 6 => 5, 8 => 7, 10 => 8],
        ],
    ],
    'wan_27' => [
        'name'             => 'Wan 2.7',
        'description'      => 'Enhanced motion smoothness and scene fidelity. Best quality-to-price ratio.',
        'tier'             => 'medium',
        'api_endpoint'     => 'https://queue.fal.run/fal-ai/wan/v2.7/text-to-video',
        'api_endpoint_i2v' => 'https://queue.fal.run/fal-ai/wan/v2.7/image-to-video',
        'aspect_ratios'    => ['16:9', '9:16', '1:1', '4:3', '3:4'],
        'resolutions'      => ['720p', '1080p'],
        'duration_param'   => 'duration',
        'duration_map'     => [4 => 4, 6 => 6, 8 => 8, 10 => 10],
        'fps_default'      => null,
        'extra_params'     => ['enable_prompt_expansion' => true],
        'cost_table'       => [
            '720p'  => [4 => 4, 6 => 6, 8 => 8, 10 => 10],
            '1080p' => [4 => 6, 6 => 9, 8 => 12, 10 => 15],
        ],
    ],
    'kling_25' => [
        'name'             => 'Kling 2.5 Pro',
        'description'      => 'Top-tier cinematic quality with unparalleled motion fluidity and prompt precision.',
        'tier'             => 'high',
        'api_endpoint'     => 'https://queue.fal.run/fal-ai/kling-video/v2.5-turbo/pro/text-to-video',
        'api_endpoint_i2v' => 'https://queue.fal.run/fal-ai/kling-video/v2.5-turbo/pro/image-to-video',
        'aspect_ratios'    => ['16:9', '9:16', '1:1'],
        'resolutions'      => ['default'],
        'duration_param'   => 'duration',
        'duration_map'     => [4 => '5', 6 => '5', 8 => '10', 10 => '10'],
        'fps_default'      => null,
        'extra_params'     => [],
        'cost_table'       => [
            'default' => [4 => 6, 6 => 8, 8 => 10, 10 => 12],
        ],
    ],
];

// ─── SMTP ────────────────────────────────────────────────────────────────
define('SMTP_HOST', getenv('SMTP_HOST') ?: 'smtp.gmail.com');
define('SMTP_PORT', getenv('SMTP_PORT') ?: 587);
define('SMTP_USER', getenv('SMTP_USER') ?: '');
define('SMTP_PASS', getenv('SMTP_PASS') ?: '');
define('SMTP_FROM', getenv('SMTP_FROM') ?: 'noreply@lefimovart.app');
define('SMTP_FROM_NAME', 'LefiMovArt');

// ─── Google OAuth ────────────────────────────────────────────────────────
define('GOOGLE_CLIENT_ID', getenv('GOOGLE_CLIENT_ID') ?: '');
define('GOOGLE_CLIENT_SECRET', getenv('GOOGLE_CLIENT_SECRET') ?: '');
define('GOOGLE_REDIRECT_URI', APP_URL . BASE_PATH . '/api/auth/google_callback.php');

// ─── Stripe ──────────────────────────────────────────────────────────────
define('STRIPE_SECRET_KEY', getenv('STRIPE_SECRET_KEY') ?: '');

// ─── Credit Plans ────────────────────────────────────────────────────────
define('PLAN_CREDITS', [
    'bronze' => 40,
    'silver' => 88,
    'gold' => 180,
]);
define('PLAN_PRICES_USD', [
    'bronze' => 299, // $2.99 in cents
    'silver' => 599,
    'gold' => 999,
]);

// ─── CORS Headers ────────────────────────────────────────────────────────
function set_cors_headers() {
    $allowed_origins = [
        'https://itonai.ro',
        'http://localhost:5173',
        'http://localhost:3000',
        'http://127.0.0.1:5173',
    ];
    
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if (in_array($origin, $allowed_origins)) {
        header('Access-Control-Allow-Origin: ' . $origin);
    } else {
        header('Access-Control-Allow-Origin: ' . APP_URL);
    }
    
    header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400');
}

// ─── JSON Response Helper ────────────────────────────────────────────────
function json_response($data, $status = 200) {
    http_response_code($status);
    header('Content-Type: application/json; charset=utf-8');
    exit(json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
}

// ─── CSRF Token ──────────────────────────────────────────────────────────
function csrf_token() {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verify_csrf($token) {
    return isset($_SESSION['csrf_token']) && hash_equals($_SESSION['csrf_token'], $token);
}
