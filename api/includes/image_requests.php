<?php

function image_generation_options(): array {
    return [
        '1:1' => [
            'api_size' => '1024x1024',
            'standard' => ['width' => 1024, 'height' => 1024, 'cost' => 4],
            'hires' => ['width' => 2048, 'height' => 2048, 'cost' => 16],
        ],
        '3:2' => [
            'api_size' => '1536x1024',
            'standard' => ['width' => 1536, 'height' => 1024, 'cost' => 6],
            'hires' => ['width' => 3072, 'height' => 2048, 'cost' => 24],
        ],
        '2:3' => [
            'api_size' => '1024x1536',
            'standard' => ['width' => 1024, 'height' => 1536, 'cost' => 6],
            'hires' => ['width' => 2048, 'height' => 3072, 'cost' => 24],
        ],
        '16:9' => [
            'api_size' => '1536x1024',
            'standard' => ['width' => 1792, 'height' => 1008, 'cost' => 7],
            'hires' => ['width' => 3584, 'height' => 2016, 'cost' => 28],
        ],
        '9:16' => [
            'api_size' => '1024x1536',
            'standard' => ['width' => 1008, 'height' => 1792, 'cost' => 7],
            'hires' => ['width' => 2016, 'height' => 3584, 'cost' => 28],
        ],
    ];
}

function image_generation_selection(string $format, string $renderQuality, string $model = ''): array {
    global $IMAGE_MODELS_CONFIG;

    // When a known image model is specified, use its cost_table
    if ($model !== '' && isset($IMAGE_MODELS_CONFIG[$model])) {
        $cfg  = $IMAGE_MODELS_CONFIG[$model];
        $cost = $cfg['cost_table'][$format][$renderQuality]
             ?? $cfg['cost_table']['1:1']['standard']
             ?? 4;

        // Resolve pixel dimensions from size_map when available
        $sizeEntry = $cfg['size_map'][$format][$renderQuality] ?? null;
        if (is_array($sizeEntry) && isset($sizeEntry['width'])) {
            $width  = $sizeEntry['width'];
            $height = $sizeEntry['height'];
        } else {
            // Fallback to legacy options for dimension info
            $legacy = image_generation_options();
            $lo     = $legacy[$format][$renderQuality] ?? $legacy['1:1']['standard'];
            $width  = $lo['width'];
            $height = $lo['height'];
        }

        return [
            'format'         => $format,
            'render_quality' => $renderQuality,
            'api_size'       => $width . 'x' . $height,
            'width'          => $width,
            'height'         => $height,
            'resolution'     => $width . 'x' . $height,
            'cost'           => $cost,
        ];
    }

    // Legacy path (no model specified) — uses hardcoded options
    $options = image_generation_options();
    if (!isset($options[$format]) || !isset($options[$format][$renderQuality])) {
        throw new InvalidArgumentException('Invalid image format or resolution');
    }

    $option = $options[$format];
    $output = $option[$renderQuality];
    return [
        'format' => $format,
        'render_quality' => $renderQuality,
        'api_size' => $option['api_size'],
        'width' => $output['width'],
        'height' => $output['height'],
        'resolution' => $output['width'] . 'x' . $output['height'],
        'cost' => $output['cost'],
    ];
}
