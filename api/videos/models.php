<?php
require_once __DIR__ . '/../config.php';

set_cors_headers();

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }
if ($_SERVER['REQUEST_METHOD'] !== 'GET') { json_response(['error' => 'Method not allowed'], 405); }

global $MODELS_CONFIG;

$models = [];
foreach ($MODELS_CONFIG as $key => $cfg) {
    $models[$key] = [
        'name'          => $cfg['name'],
        'description'   => $cfg['description'] ?? '',
        'tier'          => $cfg['tier'] ?? 'medium',
        'resolutions'   => $cfg['resolutions'] ?? ['default'],
        'aspect_ratios' => $cfg['aspect_ratios'] ?? ['16:9', '9:16', '1:1'],
        'cost_table'    => $cfg['cost_table'] ?? [],
    ];
}

json_response(['ok' => true, 'models' => $models]);
