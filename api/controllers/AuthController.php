<?php
/**
 * AuthController: signup, login, current-user.
 * MVP = phone + password. No OTP per CLAUDE.md.
 */

declare(strict_types=1);

final class AuthController
{
    public function signup(): void
    {
        $name     = trim((string) Request::input('name', ''));
        $phone    = self::normalizePhone((string) Request::input('phone', ''));
        $email    = trim((string) Request::input('email', '')) ?: null;
        $password = (string) Request::input('password', '');
        $referral = trim((string) Request::input('referral_code', '')) ?: null;

        $errors = [];
        if ($name === '' || mb_strlen($name) < 2)   { $errors['name']     = 'Name is required'; }
        if (!preg_match('/^\d{10,15}$/', $phone))   { $errors['phone']    = 'Valid phone is required'; }
        if (strlen($password) < 6)                  { $errors['password'] = 'Password must be at least 6 characters'; }
        if ($errors) { Response::error('Validation failed', 422, $errors); }

        $pdo = db();

        $check = $pdo->prepare('SELECT id FROM users WHERE phone = ? LIMIT 1');
        $check->execute([$phone]);
        if ($check->fetch()) {
            Response::error('Phone already registered', 409);
        }

        $referredBy = null;
        if ($referral) {
            $r = $pdo->prepare('SELECT id FROM users WHERE referral_code = ? LIMIT 1');
            $r->execute([$referral]);
            $row = $r->fetch();
            if ($row) { $referredBy = (int) $row['id']; }
        }

        // Default plan = Free
        $planId = (int) ($pdo->query("SELECT id FROM plans WHERE name = 'Free' LIMIT 1")
            ->fetch()['id'] ?? 0);

        $insert = $pdo->prepare(
            'INSERT INTO users (name, phone, email, password, role, plan_id, referral_code, referred_by, status)
             VALUES (?, ?, ?, ?, "seller", ?, ?, ?, "active")'
        );
        $insert->execute([
            $name,
            $phone,
            $email,
            Auth::hashPassword($password),
            $planId ?: null,
            self::generateReferralCode($pdo),
            $referredBy,
        ]);

        $userId = (int) $pdo->lastInsertId();
        $user   = self::fetchPublicUser($userId);
        $token  = Auth::issueToken($userId, 'seller');

        Response::success([
            'token' => $token,
            'user'  => $user,
        ], 'Signup successful', 201);
    }

    public function login(): void
    {
        $phone    = self::normalizePhone((string) Request::input('phone', ''));
        $password = (string) Request::input('password', '');

        if ($phone === '' || $password === '') {
            Response::error('Phone and password are required', 422);
        }

        $stmt = db()->prepare(
            'SELECT id, name, phone, email, role, password, status, parent_user_id, plan_id, referral_code
             FROM users WHERE phone = ? LIMIT 1'
        );
        $stmt->execute([$phone]);
        $row = $stmt->fetch();

        if (!$row || !Auth::verifyPassword($password, $row['password'])) {
            Response::error('Invalid phone or password', 401);
        }
        if ($row['status'] === 'suspended') {
            Response::error('Account suspended', 403);
        }

        unset($row['password']);
        $token = Auth::issueToken((int) $row['id'], $row['role']);

        Response::success([
            'token' => $token,
            'user'  => $row,
        ], 'Login successful');
    }

    public function me(): void
    {
        $user = Auth::require();
        Response::success(['user' => $user]);
    }

    // --- helpers -----------------------------------------------------

    private static function normalizePhone(string $raw): string
    {
        return preg_replace('/\D+/', '', $raw) ?? '';
    }

    private static function fetchPublicUser(int $id): array
    {
        $stmt = db()->prepare(
            'SELECT id, name, phone, email, role, parent_user_id, plan_id, status, referral_code
             FROM users WHERE id = ? LIMIT 1'
        );
        $stmt->execute([$id]);
        return $stmt->fetch() ?: [];
    }

    private static function generateReferralCode(PDO $pdo): string
    {
        $check = $pdo->prepare('SELECT 1 FROM users WHERE referral_code = ? LIMIT 1');
        do {
            $code = strtoupper(substr(bin2hex(random_bytes(4)), 0, 8));
            $check->execute([$code]);
        } while ($check->fetch());
        return $code;
    }
}
