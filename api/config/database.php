<?php
/**
 * Single shared PDO connection. Call db() anywhere after requiring this file.
 */

declare(strict_types=1);

if (!function_exists('db')) {
    function db(): PDO
    {
        static $pdo = null;
        if ($pdo instanceof PDO) {
            return $pdo;
        }

        $dsn = sprintf(
            'mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4',
            env('DB_HOST'),
            env('DB_PORT'),
            env('DB_NAME')
        );

        try {
            $pdo = new PDO($dsn, env('DB_USER'), env('DB_PASS'), [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ]);
        } catch (PDOException $e) {
            // Never leak credentials.
            http_response_code(500);
            header('Content-Type: application/json');
            echo json_encode([
                'success' => false,
                'message' => 'Database connection failed',
            ]);
            exit;
        }

        return $pdo;
    }
}
