<?php
/**
 * UserSettings: per-seller configuration (Feature 4 — repeat-order cadences).
 *
 * Kept tiny: 3 INT columns directly on `users`. No separate table, no JSON.
 * Tenant-safe by design — every method takes a $userId.
 */

declare(strict_types=1);

final class UserSettings
{
    /** Hard floors/ceilings to keep things sane on user-edited values. */
    public const MIN_DAYS = 7;
    public const MAX_DAYS = 365;

    /** Built-in defaults from CLAUDE.md. */
    public const DEFAULTS = [
        'kitchen' => 90,
        'bottle'  => 120,
        'storage' => 180,
    ];

    /**
     * Returns the full settings block for a user, falling back to defaults.
     */
    public static function get(int $userId): array
    {
        $stmt = db()->prepare(
            'SELECT repeat_days_kitchen, repeat_days_bottle, repeat_days_storage
             FROM users WHERE id = ? LIMIT 1'
        );
        $stmt->execute([$userId]);
        $row = $stmt->fetch() ?: [];

        return [
            'repeat_days' => [
                'kitchen' => (int) ($row['repeat_days_kitchen'] ?? self::DEFAULTS['kitchen']),
                'bottle'  => (int) ($row['repeat_days_bottle']  ?? self::DEFAULTS['bottle']),
                'storage' => (int) ($row['repeat_days_storage'] ?? self::DEFAULTS['storage']),
            ],
        ];
    }

    /**
     * Days to wait before suggesting a repeat order for the given category.
     * Returns 0 for "other" — meaning no auto-reminder.
     */
    public static function repeatDaysFor(int $userId, string $category): int
    {
        $category = strtolower(trim($category));
        if (!array_key_exists($category, self::DEFAULTS)) {
            return 0; // 'other' => no auto reminder
        }
        $col = 'repeat_days_' . $category;
        $stmt = db()->prepare("SELECT $col AS days FROM users WHERE id = ? LIMIT 1");
        $stmt->execute([$userId]);
        $row = $stmt->fetch() ?: [];
        return (int) ($row['days'] ?? self::DEFAULTS[$category]);
    }

    /**
     * Updates a subset of {kitchen,bottle,storage} day-counts.
     * Returns the post-update settings block.
     */
    public static function update(int $userId, array $repeatDays): array
    {
        $fields = [];
        $params = [];
        foreach (['kitchen', 'bottle', 'storage'] as $cat) {
            if (!array_key_exists($cat, $repeatDays)) { continue; }
            $n = (int) $repeatDays[$cat];
            if ($n < self::MIN_DAYS || $n > self::MAX_DAYS) {
                throw new InvalidArgumentException(
                    "$cat must be between " . self::MIN_DAYS . ' and ' . self::MAX_DAYS . ' days'
                );
            }
            $fields[] = "repeat_days_$cat = ?";
            $params[] = $n;
        }
        if (!$fields) {
            return self::get($userId);
        }
        $params[] = $userId;
        db()->prepare('UPDATE users SET ' . implode(', ', $fields) . ' WHERE id = ?')
            ->execute($params);
        return self::get($userId);
    }
}
