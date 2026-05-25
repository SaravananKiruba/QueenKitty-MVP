<?php
/**
 * Loads /api/config/.env into a process-wide $CONFIG array and
 * exposes a tiny env() helper. Shared-hosting safe (no Composer).
 */

declare(strict_types=1);

if (!function_exists('env')) {
    /**
     * @param string $key
     * @param mixed  $default
     * @return mixed
     */
    function env(string $key, $default = null)
    {
        global $CONFIG;
        return $CONFIG[$key] ?? $default;
    }
}

if (!isset($GLOBALS['CONFIG'])) {
    $GLOBALS['CONFIG'] = [];

    $envFile = __DIR__ . '/.env';
    if (is_file($envFile)) {
        $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach ($lines as $line) {
            $line = trim($line);
            if ($line === '' || str_starts_with($line, '#')) {
                continue;
            }
            $pos = strpos($line, '=');
            if ($pos === false) {
                continue;
            }
            $key   = trim(substr($line, 0, $pos));
            $value = trim(substr($line, $pos + 1));
            // Strip surrounding quotes if present
            if (strlen($value) >= 2 && ($value[0] === '"' || $value[0] === "'")) {
                $value = substr($value, 1, -1);
            }
            $GLOBALS['CONFIG'][$key] = $value;
        }
    }

    // Sensible defaults if .env missing (dev only)
    $GLOBALS['CONFIG'] += [
        'DB_HOST'      => 'localhost',
        'DB_PORT'      => '3306',
        'DB_NAME'      => 'queenkitty',
        'DB_USER'      => 'root',
        'DB_PASS'      => '',
        'JWT_SECRET'   => 'dev-insecure-change-me',
        'JWT_TTL'      => '2592000',
        'CORS_ORIGINS' => 'http://localhost:5173',
        'APP_ENV'      => 'local',
    ];
}
