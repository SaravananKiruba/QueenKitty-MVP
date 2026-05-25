<?php
/**
 * Uniform JSON response helper.
 *
 * Response format (per CLAUDE.md):
 * {
 *   "success": bool,
 *   "message": string,
 *   "data": object|array|null
 * }
 */

declare(strict_types=1);

final class Response
{
    public static function json(int $status, array $payload): void
    {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        exit;
    }

    public static function success($data = null, string $message = 'OK', int $status = 200): void
    {
        self::json($status, [
            'success' => true,
            'message' => $message,
            'data'    => $data,
        ]);
    }

    public static function error(string $message, int $status = 400, $errors = null): void
    {
        $body = [
            'success' => false,
            'message' => $message,
        ];
        if ($errors !== null) {
            $body['errors'] = $errors;
        }
        self::json($status, $body);
    }
}
