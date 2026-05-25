<?php
/**
 * RepeatController: surfaces orders whose next_repeat_date is at hand.
 * Feature 4 (CLAUDE.md) — "Contact Lakshmi · Last order 92 days ago".
 *
 * MVP rule: only show the LATEST order per (customer, product_category) so
 * users don't get duplicate reminders when a category was re-bought recently.
 */

declare(strict_types=1);

final class RepeatController
{
    /**
     * GET /repeats?scope=due|upcoming|all&window=14
     *  - due     : next_repeat_date <= today
     *  - upcoming: today < next_repeat_date <= today + window (default 14d)
     *  - all     : everything with a repeat date set
     */
    public function index(): void
    {
        $userId = Auth::userId();
        $scope  = (string) Request::query('scope', 'due');
        $window = max(1, min(90, (int) Request::query('window', 14)));
        $today  = date('Y-m-d');
        $end    = date('Y-m-d', strtotime("+{$window} days"));

        // Latest order per (customer, category) using a correlated subquery.
        // Keeps it shared-hosting friendly (no window functions required, but
        // MySQL 8 supports them anyway — this works on both).
        $sql = "SELECT o.id, o.customer_id, o.product_name, o.product_category,
                       o.amount, o.order_date, o.next_repeat_date,
                       c.name  AS customer_name,
                       c.phone AS customer_phone,
                       c.area  AS customer_area,
                       DATEDIFF(CURDATE(), o.order_date) AS days_since_order
                  FROM orders o
                  JOIN customers c
                    ON c.id = o.customer_id
                   AND c.user_id = o.user_id
                 WHERE o.user_id = ?
                   AND o.next_repeat_date IS NOT NULL
                   AND o.id = (
                        SELECT o2.id
                          FROM orders o2
                         WHERE o2.user_id     = o.user_id
                           AND o2.customer_id = o.customer_id
                           AND o2.product_category = o.product_category
                         ORDER BY o2.order_date DESC, o2.id DESC
                         LIMIT 1
                   )";
        $params = [$userId];

        switch ($scope) {
            case 'due':
                $sql     .= ' AND o.next_repeat_date <= ?';
                $params[] = $today;
                break;
            case 'upcoming':
                $sql     .= ' AND o.next_repeat_date > ? AND o.next_repeat_date <= ?';
                $params[] = $today;
                $params[] = $end;
                break;
            case 'all':
            default:
                break;
        }

        $sql .= ' ORDER BY o.next_repeat_date ASC, o.id DESC LIMIT 200';

        $stmt = db()->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        Response::success([
            'repeats' => $rows,
            'counts'  => self::counts($userId, $today, $end),
        ]);
    }

    /**
     * POST /repeats/{order_id}/snooze
     * Body: { days?: int, next_repeat_date?: string }
     * Pushes the order's next_repeat_date forward.
     */
    public function snooze(string $id): void
    {
        $userId = Auth::userId();
        $id     = (int) $id;

        $date = trim((string) Request::input('next_repeat_date', ''));
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $date)) {
            $days = max(1, min(365, (int) Request::input('days', 14)));
            $date = date('Y-m-d', strtotime("+{$days} days"));
        }

        $stmt = db()->prepare(
            'UPDATE orders SET next_repeat_date = ?
              WHERE id = ? AND user_id = ?'
        );
        $stmt->execute([$date, $id, $userId]);
        if ($stmt->rowCount() === 0) { Response::error('Order not found', 404); }

        Response::success(['next_repeat_date' => $date], 'Reminder snoozed');
    }

    /**
     * POST /repeats/{order_id}/dismiss
     * Clears the reminder entirely for this order (sets next_repeat_date NULL).
     */
    public function dismiss(string $id): void
    {
        $userId = Auth::userId();
        $stmt   = db()->prepare(
            'UPDATE orders SET next_repeat_date = NULL
              WHERE id = ? AND user_id = ?'
        );
        $stmt->execute([(int) $id, $userId]);
        if ($stmt->rowCount() === 0) { Response::error('Order not found', 404); }
        Response::success(null, 'Reminder dismissed');
    }

    // --- helpers -----------------------------------------------------

    private static function counts(int $userId, string $today, string $end): array
    {
        // Only count "latest order per (customer,category)" rows to match the list.
        $sql = "SELECT
                  SUM(CASE WHEN o.next_repeat_date <= ?                                THEN 1 ELSE 0 END) AS due,
                  SUM(CASE WHEN o.next_repeat_date >  ? AND o.next_repeat_date <= ?    THEN 1 ELSE 0 END) AS upcoming
                FROM orders o
                WHERE o.user_id = ?
                  AND o.next_repeat_date IS NOT NULL
                  AND o.id = (
                    SELECT o2.id FROM orders o2
                     WHERE o2.user_id = o.user_id
                       AND o2.customer_id = o.customer_id
                       AND o2.product_category = o.product_category
                     ORDER BY o2.order_date DESC, o2.id DESC LIMIT 1
                  )";
        $stmt = db()->prepare($sql);
        $stmt->execute([$today, $today, $end, $userId]);
        $row = $stmt->fetch() ?: [];
        return [
            'due'      => (int) ($row['due']      ?? 0),
            'upcoming' => (int) ($row['upcoming'] ?? 0),
        ];
    }
}
