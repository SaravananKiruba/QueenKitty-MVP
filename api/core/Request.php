<?php
/**
 * Request helpers: JSON body parsing, path/query access.
 */

declare(strict_types=1);

final class Request
{
    private static ?array $jsonCache = null;

    public static function method(): string
    {
        return strtoupper($_SERVER['REQUEST_METHOD'] ?? 'GET');
    }

    public static function path(): string
    {
        $uri  = $_SERVER['REQUEST_URI'] ?? '/';
        $path = parse_url($uri, PHP_URL_PATH) ?: '/';
        // Strip /api prefix so routes can be declared as '/customers' etc.
        if (str_starts_with($path, '/api')) {
            $path = substr($path, 4);
        }
        if ($path === '' || $path === false) {
            $path = '/';
        }
        return rtrim($path, '/') ?: '/';
    }

    public static function json(): array
    {
        if (self::$jsonCache !== null) {
            return self::$jsonCache;
        }
        $raw = file_get_contents('php://input');
        if ($raw === '' || $raw === false) {
            return self::$jsonCache = [];
        }
        $decoded = json_decode($raw, true);
        return self::$jsonCache = is_array($decoded) ? $decoded : [];
    }

    public static function input(string $key, $default = null)
    {
        $body = self::json();
        return $body[$key] ?? $_POST[$key] ?? $_GET[$key] ?? $default;
    }

    public static function query(string $key, $default = null)
    {
        return $_GET[$key] ?? $default;
    }

    public static function header(string $name): ?string
    {
        $key = 'HTTP_' . strtoupper(str_replace('-', '_', $name));
        $val = $_SERVER[$key] ?? null;
        if ($val === null && function_exists('getallheaders')) {
            $headers = getallheaders() ?: [];
            foreach ($headers as $k => $v) {
                if (strcasecmp($k, $name) === 0) {
                    return $v;
                }
            }
        }
        return $val;
    }
}
