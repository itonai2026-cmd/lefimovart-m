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

// Legacy Base44 auth migration. Used only for imported users without a local password_hash.
define('BASE44_LEGACY_AUTH_ENABLED', filter_var(getenv('BASE44_LEGACY_AUTH_ENABLED') ?: false, FILTER_VALIDATE_BOOLEAN));
define('BASE44_LEGACY_APP_ID', getenv('BASE44_LEGACY_APP_ID') ?: '');
define('BASE44_LEGACY_BASE_URL', rtrim(getenv('BASE44_LEGACY_BASE_URL') ?: 'https://lefi-m.base44.app', '/'));
define('BASE44_LEGACY_LOGIN_PATH', getenv('BASE44_LEGACY_LOGIN_PATH') ?: '/api/apps/{appId}/auth/login');
define('BASE44_LEGACY_TIMEOUT', max(3, (int)(getenv('BASE44_LEGACY_TIMEOUT') ?: 10)));

// ─── AI APIs ──────────────────────────────────────────────────────────────
define('OPENAI_API_KEY', getenv('OPENAI_API_KEY') ?: '');
define('OPENAI_IMAGE_MODEL', getenv('OPENAI_IMAGE_MODEL') ?: 'gpt-image-1.5');
define('FAL_AI_API_KEY', getenv('FAL_AI_API_KEY') ?: '');
define('FAL_AI_BASE_URL', 'https://queue.fal.run');
define('DEFAULT_IMAGE_MODEL', getenv('DEFAULT_IMAGE_MODEL') ?: 'flux_dev');

// ─── Image Models ─────────────────────────────────────────────────────────
// cost_table: credits indexed by [format][quality]
// FLUX.1 [dev]        $0.025/megapixel  (Black Forest Labs)
// Nano Banana Pro     $0.15/image std, $0.30/image 4K  (Google)
// GPT Image 2         ~$0.01–$0.41/image token-based   (OpenAI via Fal.AI)
$IMAGE_MODELS_CONFIG = [
    'flux_dev' => [
        'name'             => 'FLUX.1 [dev]',
        'description'      => 'High-quality drafts with fast generation. Great value.',
        'tier'             => 'low',
        'provider'         => 'fal',
        'api_endpoint'     => 'https://fal.run/fal-ai/flux/dev',
        'api_endpoint_i2i' => 'https://fal.run/fal-ai/flux/dev/image-to-image',
        'supports_editing' => true,
        'aspect_ratios'    => ['1:1', '3:2', '2:3', '16:9', '9:16'],
        'size_param'       => 'image_size',
        'size_map'         => [
            '1:1'  => ['standard' => ['width' => 1024, 'height' => 1024], 'hires' => ['width' => 2048, 'height' => 2048]],
            '3:2'  => ['standard' => ['width' => 1536, 'height' => 1024], 'hires' => ['width' => 3072, 'height' => 2048]],
            '2:3'  => ['standard' => ['width' => 1024, 'height' => 1536], 'hires' => ['width' => 2048, 'height' => 3072]],
            '16:9' => ['standard' => ['width' => 1344, 'height' => 768],  'hires' => ['width' => 2688, 'height' => 1536]],
            '9:16' => ['standard' => ['width' => 768,  'height' => 1344], 'hires' => ['width' => 1536, 'height' => 2688]],
        ],
        'extra_params'     => ['num_inference_steps' => 28, 'guidance_scale' => 3.5, 'output_format' => 'png'],
        'cost_table'       => [
            '1:1'  => ['standard' => 1, 'hires' => 2],
            '3:2'  => ['standard' => 1, 'hires' => 2],
            '2:3'  => ['standard' => 1, 'hires' => 2],
            '16:9' => ['standard' => 1, 'hires' => 2],
            '9:16' => ['standard' => 1, 'hires' => 2],
        ],
    ],
    'nano_banana' => [
        'name'             => 'Nano Banana Pro',
        'description'      => 'Clean images, precise editing, good consistency. Google model.',
        'tier'             => 'medium',
        'provider'         => 'fal',
        'api_endpoint'     => 'https://fal.run/fal-ai/nano-banana-pro',
        'supports_editing' => true,
        'aspect_ratios'    => ['1:1', '3:2', '2:3', '16:9', '9:16'],
        'size_param'       => 'aspect_ratio',
        'size_map'         => [
            '1:1'  => ['standard' => '1:1',  'hires' => '1:1'],
            '3:2'  => ['standard' => '3:2',  'hires' => '3:2'],
            '2:3'  => ['standard' => '2:3',  'hires' => '2:3'],
            '16:9' => ['standard' => '16:9', 'hires' => '16:9'],
            '9:16' => ['standard' => '9:16', 'hires' => '9:16'],
        ],
        'extra_params'     => ['output_format' => 'png'],
        'hires_params'     => ['upscale' => true],
        'cost_table'       => [
            '1:1'  => ['standard' => 3, 'hires' => 6],
            '3:2'  => ['standard' => 3, 'hires' => 6],
            '2:3'  => ['standard' => 3, 'hires' => 6],
            '16:9' => ['standard' => 3, 'hires' => 6],
            '9:16' => ['standard' => 3, 'hires' => 6],
        ],
    ],
    'gpt_image_2' => [
        'name'             => 'GPT Image 2',
        'description'      => 'Assets with text, UI visuals, fine detail. OpenAI model served through Fal.AI.',
        'tier'             => 'high',
        'provider'         => 'fal',
        'api_endpoint'     => 'https://fal.run/openai/gpt-image-2',
        'supports_editing' => true,
        'aspect_ratios'    => ['1:1', '3:2', '2:3', '16:9', '9:16'],
        'size_param'       => 'image_size',
        'size_map'         => [
            '1:1'  => ['standard' => ['width' => 1024, 'height' => 1024], 'hires' => ['width' => 2048, 'height' => 2048]],
            '3:2'  => ['standard' => ['width' => 1536, 'height' => 1024], 'hires' => ['width' => 3072, 'height' => 2048]],
            '2:3'  => ['standard' => ['width' => 1024, 'height' => 1536], 'hires' => ['width' => 2048, 'height' => 3072]],
            '16:9' => ['standard' => ['width' => 1792, 'height' => 1024], 'hires' => ['width' => 3584, 'height' => 2048]],
            '9:16' => ['standard' => ['width' => 1024, 'height' => 1792], 'hires' => ['width' => 2048, 'height' => 3584]],
        ],
        'extra_params'     => ['quality' => 'high', 'output_format' => 'png'],
        'cost_table'       => [
            '1:1'  => ['standard' => 4,  'hires' => 16],
            '3:2'  => ['standard' => 6,  'hires' => 24],
            '2:3'  => ['standard' => 6,  'hires' => 24],
            '16:9' => ['standard' => 7,  'hires' => 28],
            '9:16' => ['standard' => 7,  'hires' => 28],
        ],
    ],
];

// ─── Video Models ─────────────────────────────────────────────────────────
// cost_table: credits indexed by [resolution][duration_seconds]
// Prices derived from Fal.ai per-second / per-video rates
// Kling O3 Std  $0.084/sec (no audio)
// Wan 2.7       $0.10/sec @720p, $0.15/sec @1080p
// Kling 2.5 Pro $0.35/5s, +$0.07/sec after
$MODELS_CONFIG = [
    'kling_o3' => [
        'name'             => 'Kling O3',
        'description'      => 'Latest Kling model with realistic motion and multi-shot support. Great value.',
        'tier'             => 'low',
        'api_endpoint'     => 'https://queue.fal.run/fal-ai/kling-video/o3/standard/text-to-video',
        'api_endpoint_i2v' => 'https://queue.fal.run/fal-ai/kling-video/o3/standard/image-to-video',
        'aspect_ratios'    => ['16:9', '9:16', '1:1'],
        'resolutions'      => ['720p', '1080p'],
        'endpoint_map'     => [
            '720p'  => [
                'api_endpoint'     => 'https://queue.fal.run/fal-ai/kling-video/o3/standard/text-to-video',
                'api_endpoint_i2v' => 'https://queue.fal.run/fal-ai/kling-video/o3/standard/image-to-video',
            ],
            '1080p' => [
                'api_endpoint'     => 'https://queue.fal.run/fal-ai/kling-video/o3/pro/text-to-video',
                'api_endpoint_i2v' => 'https://queue.fal.run/fal-ai/kling-video/o3/pro/image-to-video',
            ],
        ],
        'duration_param'   => 'duration',
        'duration_map'     => [4 => '4', 6 => '6', 8 => '8', 10 => '10'],
        'fps_default'      => null,
        'extra_params'     => [],
        'cost_table'       => [
            '720p'  => [4 => 3, 6 => 5, 8 => 7, 10 => 8],
            '1080p' => [4 => 4, 6 => 7, 8 => 9, 10 => 11],
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
    'kling_3' => [
        'name'             => 'Kling 3.0 Pro',
        'description'      => 'Latest Kling model with cinematic visuals, multi-shot storyboarding, and native audio. Best quality.',
        'tier'             => 'high',
        'api_endpoint'     => 'https://queue.fal.run/fal-ai/kling-video/v3/pro/text-to-video',
        'api_endpoint_i2v' => 'https://queue.fal.run/fal-ai/kling-video/v3/pro/image-to-video',
        'aspect_ratios'    => ['16:9', '9:16', '1:1'],
        'resolutions'      => ['720p', '1080p'],
        'endpoint_map'     => [
            '720p'  => [
                'api_endpoint'     => 'https://queue.fal.run/fal-ai/kling-video/v3/standard/text-to-video',
                'api_endpoint_i2v' => 'https://queue.fal.run/fal-ai/kling-video/v3/standard/image-to-video',
            ],
            '1080p' => [
                'api_endpoint'     => 'https://queue.fal.run/fal-ai/kling-video/v3/pro/text-to-video',
                'api_endpoint_i2v' => 'https://queue.fal.run/fal-ai/kling-video/v3/pro/image-to-video',
            ],
        ],
        'duration_param'   => 'duration',
        'duration_map'     => [4 => '4', 6 => '6', 8 => '8', 10 => '10'],
        'fps_default'      => null,
        'extra_params'     => ['generate_audio' => false],
        'cost_table'       => [
            '720p'  => [4 => 5, 6 => 7, 8 => 10, 10 => 12],
            '1080p' => [4 => 7, 6 => 11, 8 => 14, 10 => 18],
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
define('STRIPE_ENDPOINT_SECRET', getenv('STRIPE_ENDPOINT_SECRET') ?: '');

// ─── Credit Plans ────────────────────────────────────────────────────────
define('PLAN_NAMES', [
    'bronze'  => 'Bronze',
    'silver'  => 'Silver',
    'gold'    => 'Gold',
    'diamond' => 'Diamond',
    'rhodium' => 'Rhodium',
]);
define('PLAN_CREDITS', [
    'bronze'  => 16,
    'silver'  => 34,
    'gold'    => 65,
    'diamond' => 134,
    'rhodium' => 204,
]);
define('PLAN_PRICES_CENTS', [
    'bronze'  => 299, // €2.99
    'silver'  => 599, // €5.99
    'gold'    => 999, // €9.99
    'diamond' => 1999, // €19.99
    'rhodium' => 2999, // €29.99
]);
define('PLAN_CURRENCY', 'eur');
define('PLAN_PRICE_IDS', [
    'bronze'  => getenv('STRIPE_PRICE_BRONZE') ?: '',
    'silver'  => getenv('STRIPE_PRICE_SILVER') ?: '',
    'gold'    => getenv('STRIPE_PRICE_GOLD') ?: '',
    'diamond' => getenv('STRIPE_PRICE_DIAMOND') ?: '',
    'rhodium' => getenv('STRIPE_PRICE_RHODIUM') ?: '',
]);

// ─── Google Play Billing ─────────────────────────────────────────────────
define('GOOGLE_PLAY_PACKAGE_NAME', getenv('GOOGLE_PLAY_PACKAGE_NAME') ?: 'ro.itonai.lefimovart');
define('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON', getenv('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON') ?: '');
define('GOOGLE_PLAY_SERVICE_ACCOUNT_FILE', getenv('GOOGLE_PLAY_SERVICE_ACCOUNT_FILE') ?: '');
define('GOOGLE_PLAY_PRODUCT_IDS', [
    'bronze'  => getenv('GOOGLE_PLAY_PRODUCT_BRONZE') ?: 'credits_bronze',
    'silver'  => getenv('GOOGLE_PLAY_PRODUCT_SILVER') ?: 'credits_silver',
    'gold'    => getenv('GOOGLE_PLAY_PRODUCT_GOLD') ?: 'credits_gold',
    'diamond' => getenv('GOOGLE_PLAY_PRODUCT_DIAMOND') ?: 'credits_diamond',
    'rhodium' => getenv('GOOGLE_PLAY_PRODUCT_RHODIUM') ?: 'credits_rhodium',
]);

// ─── CORS Headers ────────────────────────────────────────────────────────
function set_cors_headers() {
    $allowed_origins = [
        'https://itonai.ro',
        'capacitor://localhost',
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
