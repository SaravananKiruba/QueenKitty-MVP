<?php
/**
 * Minimal HS256 JWT + session/auth helpers.
 *
 * No Composer / no firebase/php-jwt — shared-hosting friendly.
 * Tokens are stateless. Payload: { sub, role, iat, exp }.
 */

declare(strict_types=1);

final class Auth
{
    private static ?array $currentUser = null;

    public static function hashPassword(string $plain): string
    {
        return password_hash($plain, PASSWORD_BCRYPT);
    }

    public static function verifyPassword(string $plain, string $hash): bool
    {
        return password_verify($plain, $hash);
    }

    public static function issueToken(int $userId, string $role): string
    {
        $now = time();
        $ttl = (int) env('JWT_TTL', 2592000);

        $payload = [
            'sub'  => $userId,
            'role' => $role,
            'iat'  => $now,
            'exp'  => $now + $ttl,
        ];

        return self::encode($payload);
    }

    /**
     * Returns decoded payload if valid, otherwise null.
     */
    public static function decodeToken(string $jwt): ?array
    {
        $parts = explode('.', $jwt);
        if (count($parts) !== 3) {
            return null;
        }
        [$h64, $p64, $s64] = $parts;

        $expected = self::b64UrlEncode(hash_hmac(
            'sha256',
            $h64 . '.' . $p64,
            (string) env('JWT_SECRET'),
            true
        ));
        if (!hash_equals($expected, $s64)) {
            return null;
        }

        $payload = json_decode(self::b64UrlDecode($p64), true);
        if (!is_array($payload)) {
            return null;
        }
        if (!isset($payload['exp']) || $payload['exp'] < time()) {
            return null;
        }
        return $payload;
    }

    /**
     * Loads the user from Authorization: Bearer <jwt>. Returns user row or null.
     * Caches per-request.
     */
    public static function user(): ?array
    {
        if (self::$currentUser !== null) {
            return self::$currentUser ?: null;
        }

        $header = Request::header('Authorization') ?? '';
        if (!preg_match('/^Bearer\s+(.+)$/i', $header, $m)) {
            self::$currentUser = [];
            return null;
        }

        $payload = self::decodeToken(trim($m[1]));
        if (!$payload || empty($payload['sub'])) {
            self::$currentUser = [];
            return null;
        }

        $stmt = db()->prepare(
            'SELECT id, name, phone, email, role, parent_user_id, plan_id, status, referral_code
             FROM users WHERE id = ? LIMIT 1'
        );
        $stmt->execute([(int) $payload['sub']]);
        $row = $stmt->fetch();

        if (!$row || $row['status'] === 'suspended') {
            self::$currentUser = [];
            return null;
        }

        return self::$currentUser = $row;
    }

    /**
     * Aborts the request with 401 if no valid token. Returns user row otherwise.
     */
    public static function require(): array
    {
        $user = self::user();
        if (!$user) {
            Response::error('Unauthorized', 401);
        }
        return $user;
    }

    public static function requireRole(string ...$roles): array
    {
        $user = self::require();
        if (!in_array($user['role'], $roles, true)) {
            Response::error('Forbidden', 403);
        }
        return $user;
    }

    /**
     * Authenticated user id — use this in EVERY tenant-owned query (CLAUDE.md).
     */
    public static function userId(): int
    {
        return (int) self::require()['id'];
    }

    // --- internals ---------------------------------------------------

    private static function encode(array $payload): string
    {
        $header  = ['alg' => 'HS256', 'typ' => 'JWT'];
        $h64     = self::b64UrlEncode(json_encode($header));
        $p64     = self::b64UrlEncode(json_encode($payload));
        $sig     = hash_hmac('sha256', $h64 . '.' . $p64, (string) env('JWT_SECRET'), true);
        return $h64 . '.' . $p64 . '.' . self::b64UrlEncode($sig);
    }

    private static function b64UrlEncode(string $bin): string
    {
        return rtrim(strtr(base64_encode($bin), '+/', '-_'), '=');
    }

    private static function b64UrlDecode(string $txt): string
    {
        $pad = strlen($txt) % 4;
        if ($pad) {
            $txt .= str_repeat('=', 4 - $pad);
        }
        return base64_decode(strtr($txt, '-_', '+/')) ?: '';
    }
}
