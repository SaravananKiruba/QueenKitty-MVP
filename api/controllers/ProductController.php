<?php
/**
 * ProductController — product master CRUD + search.
 *
 * Tenant-safety rules (CLAUDE.md multi-tenant + seller groups):
 *   READ  → 3-tier visibility:
 *           1. Global products (user_id IS NULL, group_id IS NULL)
 *           2. Group products (group_id = seller's group_id)
 *           3. Seller's own products (user_id = seller's id)
 *   WRITE → seller can only create/edit/delete their OWN products
 *           Super-admin manages global/group products via DB/migration.
 *
 * Every query that writes must filter by Auth::userId().
 */

declare(strict_types=1);

final class ProductController
{
    /**
     * GET /products?q=&limit=
     *
     * Returns (3-tier visibility):
     *   1. Global products (user_id IS NULL, group_id IS NULL)
     *   2. Group products (group_id = seller's group)
     *   3. Seller's own custom products (user_id = seller)
     *
     * q: partial match on product_name or product_code (case-insensitive).
     */
    public function index(): void
    {
        $userId  = Auth::userId();
        $groupId = self::getUserGroupId($userId);
        $q       = trim((string) Request::query('q', ''));
        $limit   = min(100, max(1, (int) Request::query('limit', 50)));

        $params = [];

        $sql = 'SELECT id, user_id, group_id, product_name, product_code, category,
                       mrp, default_price, image_url, is_active,
                       created_at, updated_at
                  FROM products
                 WHERE is_active = 1
                   AND (
                     (user_id IS NULL AND group_id IS NULL)';  // Global products

        if ($groupId !== null) {
            $sql     .= ' OR group_id = ?';  // Group products
            $params[] = $groupId;
        }

        $sql     .= ' OR user_id = ?';  // Seller's own products
        $params[] = $userId;
        $sql     .= ')';

        if ($q !== '') {
            $like     = '%' . $q . '%';
            $sql     .= ' AND (product_name LIKE ? OR product_code LIKE ?)';
            $params[] = $like;
            $params[] = $like;
        }

        // Global first, then group, then seller-custom, all sorted by name
        $sql .= ' ORDER BY
                    (user_id IS NULL AND group_id IS NULL) DESC,
                    (group_id IS NOT NULL) DESC,
                    product_name ASC
                  LIMIT ' . $limit;

        $stmt = db()->prepare($sql);
        $stmt->execute($params);
        $rows = $stmt->fetchAll();

        // Cast numeric types for JSON consistency
        foreach ($rows as &$row) {
            $row['mrp']           = $row['mrp']           !== null ? (float) $row['mrp'] : null;
            $row['default_price'] = $row['default_price'] !== null ? (float) $row['default_price'] : null;
            $row['is_active']     = (bool) $row['is_active'];
            $row['is_global']     = $row['user_id'] === null && $row['group_id'] === null;
            $row['is_group']      = $row['user_id'] === null && $row['group_id'] !== null;
            $row['is_custom']     = $row['user_id'] !== null;
        }
        unset($row);

        Response::success(['products' => $rows]);
    }

    /**
     * POST /products
     * Creates a seller-custom product owned by the authenticated user.
     */
    public function store(): void
    {
        $userId = Auth::userId();

        [$data, $errors] = self::validatePayload();
        if ($errors) { Response::error('Validation failed', 422, $errors); }

        $stmt = db()->prepare(
            'INSERT INTO products
                (user_id, product_name, product_code, category, mrp, default_price)
             VALUES (?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $userId,
            $data['product_name'],
            $data['product_code'],
            $data['category'],
            $data['mrp'],
            $data['default_price'],
        ]);
        $id  = (int) db()->lastInsertId();
        $row = self::fetchOwned($userId, $id);

        Response::success(['product' => $row], 'Product created', 201);
    }

    /**
     * PATCH /products/{id}
     * Seller can only update their OWN products.
     */
    public function update(string $id): void
    {
        $userId = Auth::userId();
        $id     = (int) $id;

        $existing = self::fetchOwned($userId, $id);
        if (!$existing) { Response::error('Product not found', 404); }

        $fields = [];
        $params = [];

        if (Request::input('product_name') !== null) {
            $name = trim((string) Request::input('product_name'));
            if (mb_strlen($name) < 2) { Response::error('Product name too short', 422); }
            $fields[] = 'product_name = ?'; $params[] = $name;
        }
        if (Request::input('product_code') !== null) {
            $fields[] = 'product_code = ?';
            $params[] = trim((string) Request::input('product_code')) ?: null;
        }
        if (Request::input('category') !== null) {
            $fields[] = 'category = ?';
            $params[] = self::normalizeCategory((string) Request::input('category'));
        }
        if (Request::input('mrp') !== null) {
            $fields[] = 'mrp = ?';
            $params[] = self::money(Request::input('mrp'));
        }
        if (Request::input('default_price') !== null) {
            $fields[] = 'default_price = ?';
            $params[] = self::money(Request::input('default_price'));
        }
        if (Request::input('is_active') !== null) {
            $fields[] = 'is_active = ?';
            $params[] = (int) (bool) Request::input('is_active');
        }

        if (!$fields) { Response::error('Nothing to update', 422); }

        $params[] = $id;
        $params[] = $userId;
        db()->prepare(
            'UPDATE products SET ' . implode(', ', $fields)
            . ' WHERE id = ? AND user_id = ?'
        )->execute($params);

        Response::success(['product' => self::fetchOwned($userId, $id)], 'Product updated');
    }

    /**
     * DELETE /products/{id}
     * Soft-delete: sets is_active = 0. Seller's own products only.
     */
    public function destroy(string $id): void
    {
        $userId = Auth::userId();
        $id     = (int) $id;

        $stmt = db()->prepare(
            'UPDATE products SET is_active = 0 WHERE id = ? AND user_id = ? AND is_active = 1'
        );
        $stmt->execute([$id, $userId]);

        if ($stmt->rowCount() === 0) { Response::error('Product not found', 404); }
        Response::success(null, 'Product removed');
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private static function fetchOwned(int $userId, int $id): ?array
    {
        $stmt = db()->prepare(
            'SELECT id, user_id, product_name, product_code, category,
                    mrp, default_price, image_url, is_active, created_at, updated_at
               FROM products
              WHERE id = ? AND user_id = ? LIMIT 1'
        );
        $stmt->execute([$id, $userId]);
        $row = $stmt->fetch();
        if (!$row) { return null; }
        $row['mrp']           = $row['mrp']           !== null ? (float) $row['mrp'] : null;
        $row['default_price'] = $row['default_price'] !== null ? (float) $row['default_price'] : null;
        $row['is_active']     = (bool) $row['is_active'];
        $row['is_system']     = false;
        return $row;
    }

    /**
     * Validates POST /products payload.
     * Returns [$data, $errors].
     */
    private static function validatePayload(): array
    {
        $errors = [];
        $name   = trim((string) Request::input('product_name', ''));
        if (mb_strlen($name) < 2) { $errors['product_name'] = 'Product name is required'; }

        $mrp   = Request::input('mrp') !== null ? self::money(Request::input('mrp')) : null;
        $price = Request::input('default_price') !== null ? self::money(Request::input('default_price')) : null;

        if ($mrp !== null && $mrp < 0)   { $errors['mrp']           = 'MRP cannot be negative'; }
        if ($price !== null && $price < 0){ $errors['default_price'] = 'Price cannot be negative'; }

        $data = [
            'product_name'  => $name,
            'product_code'  => trim((string) Request::input('product_code', '')) ?: null,
            'category'      => self::normalizeCategory((string) Request::input('category', 'other')),
            'mrp'           => $mrp,
            'default_price' => $price,
        ];

        return [$data, $errors];
    }

    private static function normalizeCategory(string $cat): string
    {
        return in_array($cat, ['kitchen', 'bottle', 'storage', 'other'], true) ? $cat : 'other';
    }

    private static function money(mixed $v): float
    {
        return round(max(0.0, (float) $v), 2);
    }

    /**
     * Get seller's group_id from users table.
     * Returns NULL if user is admin or has no group.
     */
    private static function getUserGroupId(int $userId): ?int
    {
        $stmt = db()->prepare('SELECT group_id FROM users WHERE id = ? LIMIT 1');
        $stmt->execute([$userId]);
        $row = $stmt->fetch();
        return $row && $row['group_id'] !== null ? (int) $row['group_id'] : null;
    }
}
