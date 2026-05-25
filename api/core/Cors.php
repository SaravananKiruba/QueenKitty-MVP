<?php
/**
 * CORS handler. Reads CORS_ORIGINS (comma-separated) from .env.
 * Same-origin production deployments don't need it; harmless to leave on.
 */

declare(strict_types=1);

final class Cors
{
    public static function handle(): void
    {
        $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
        $allowed = array_filter(array_map('trim', explode(',', (string) env('CORS_ORIGINS', ''))));

        if ($origin && in_array($origin, $allowed, true)) {
            header('Access-Control-Allow-Origin: ' . $origin);
            header('Vary: Origin');
            header('Access-Control-Allow-Credentials: true');
            header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type, Authorization');
            header('Access-Control-Max-Age: 86400');
        }

        if (Request::method() === 'OPTIONS') {
            http_response_code(204);
            exit;
        }
    }
}
