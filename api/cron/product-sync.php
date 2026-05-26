<?php
/**
 * product-sync.php — QueenKitty Product Sync Cron Script (Feature 3)
 *
 * PURPOSE:
 *   Fetch products from a published Google Sheet and upsert them as
 *   system products (user_id IS NULL) in the products table.
 *
 * HOW TO RUN:
 *   cPanel cron (recommended):
 *     0 3 * * * php /home/<user>/public_html/api/cron/product-sync.php >> /home/<user>/logs/product-sync.log 2>&1
 *
 *   Manual run (safe to run anytime):
 *     php /path/to/api/cron/product-sync.php
 *
 * CONFIGURATION (.env keys):
 *   PRODUCT_SHEET_URL  = https://docs.google.com/spreadsheets/d/SHEET_ID/export?format=csv
 *
 *   Set PRODUCT_SYNC_ENABLED=false to disable without removing the cron job.
 *
 * SAFETY RULES:
 *   - Never hard-deletes existing products — sets is_active = 0 instead
 *   - Duplicate-safe: upserts by product_code (or product_name if no code)
 *   - Retry-safe: can be run multiple times without side effects
 *   - Tracks last_synced_at and last_price_change per row
 *
 * WHAT IT SYNCS:
 *   Only SYSTEM products (user_id IS NULL).
 *   Seller-custom products are NEVER touched by this script.
 */

declare(strict_types=1);

// ── Bootstrap (same files as index.php, no HTTP layer needed) ────────────────
$apiDir = dirname(__DIR__);
require $apiDir . '/config/config.php';
require $apiDir . '/config/database.php';
require $apiDir . '/providers/ProductProviderInterface.php';
require $apiDir . '/providers/GoogleSheetProvider.php';

// ── Logging helper ────────────────────────────────────────────────────────────
function syncLog(string $level, string $msg): void
{
    $ts = date('Y-m-d H:i:s');
    echo "[{$ts}] [{$level}] {$msg}\n";
}

// ── Guard: allow disabling without touching cron schedule ────────────────────
if (strtolower(trim((string) env('PRODUCT_SYNC_ENABLED', 'true'))) === 'false') {
    syncLog('INFO', 'PRODUCT_SYNC_ENABLED=false — sync skipped.');
    exit(0);
}

// ── Build Google Sheet provider ───────────────────────────────────────────────
try {
    $provider = buildProvider();
} catch (RuntimeException $e) {
    syncLog('ERROR', 'Could not initialize provider: ' . $e->getMessage());
    exit(1);
}

// ── Fetch products from source ────────────────────────────────────────────────
syncLog('INFO', "Fetching products via [{$provider->sourceIdentifier()}]...");

try {
    $incoming = $provider->fetchProducts();
} catch (RuntimeException $e) {
    syncLog('ERROR', 'Fetch failed: ' . $e->getMessage());
    exit(1);
}

syncLog('INFO', 'Fetched ' . count($incoming) . ' product row(s).');

if (empty($incoming)) {
    syncLog('WARN', 'No products returned from source — aborting to avoid wiping catalog.');
    exit(0);
}

// ── Upsert into DB ────────────────────────────────────────────────────────────
$pdo      = db();
$now      = date('Y-m-d H:i:s');
$sourceId = $provider->sourceIdentifier();

$stats = ['inserted' => 0, 'updated' => 0, 'price_changed' => 0, 'skipped' => 0, 'errors' => 0];

// Collect product_codes from incoming to soft-delete stale system products later.
$incomingKeys = [];

foreach ($incoming as $item) {
    try {
        $result = upsertProduct($pdo, $item, $sourceId, $now);
        $stats[$result]++;
        $key = resolveKey($item);
        if ($key !== null) { $incomingKeys[] = $key; }
    } catch (Throwable $e) {
        syncLog('WARN', "Row skipped due to error: {$e->getMessage()} — " . json_encode($item));
        $stats['errors']++;
    }
}

// ── Soft-delete system products no longer in source ───────────────────────────
if (!empty($incomingKeys)) {
    deactivateStaleProducts($pdo, $incomingKeys, $sourceId, $now);
}

// ── Summary ───────────────────────────────────────────────────────────────────
syncLog('INFO', sprintf(
    'Sync complete — inserted:%d updated:%d price_changes:%d skipped:%d errors:%d',
    $stats['inserted'],
    $stats['updated'],
    $stats['price_changed'],
    $stats['skipped'],
    $stats['errors']
));

exit($stats['errors'] > 0 ? 1 : 0);

// ── Functions ─────────────────────────────────────────────────────────────────

function buildProvider(): ProductProviderInterface
{
    $url = (string) env('PRODUCT_SHEET_URL', '');
    if ($url === '') {
        throw new RuntimeException('PRODUCT_SHEET_URL is not set in .env');
    }
    // Basic sanity check — not a security validation
    if (strpos($url, 'docs.google.com') === false || strpos($url, 'spreadsheets') === false) {
        throw new RuntimeException('PRODUCT_SHEET_URL does not look like a Google Sheets export URL');
    }
    return new GoogleSheetProvider($url);
}

/**
 * Upserts one product row (system product — user_id IS NULL).
 * Returns: 'inserted' | 'updated' | 'price_changed' | 'skipped'
 */
function upsertProduct(PDO $pdo, array $item, string $sourceId, string $now): string
{
    $name = trim($item['product_name'] ?? '');
    if (mb_strlen($name) < 2) { return 'skipped'; }

    $code     = isset($item['product_code']) && trim((string) $item['product_code']) !== ''
                ? trim((string) $item['product_code'])
                : null;
    $category = normalizeCategory((string) ($item['category'] ?? 'other'));
    $mrp      = isset($item['mrp']) && $item['mrp'] !== null ? (float) $item['mrp'] : null;
    $price    = isset($item['default_price']) && $item['default_price'] !== null ? (float) $item['default_price'] : null;

    // Try to find an existing system product by product_code (preferred) or name
    $existing = findExistingSystemProduct($pdo, $code, $name);

    if ($existing === null) {
        // INSERT new system product
        $pdo->prepare(
            'INSERT INTO products
                (user_id, product_name, product_code, category, mrp, default_price,
                 source, is_active, last_synced_at, sync_source)
             VALUES (NULL, ?, ?, ?, ?, ?, ?, 1, ?, ?)'
        )->execute([$name, $code, $category, $mrp, $price, 'google_sheet', $now, $sourceId]);
        return 'inserted';
    }

    // Check if price changed to track last_price_change
    $priceChanged = (
        ((float) ($existing['mrp']           ?? 0)) !== ($mrp   ?? 0) ||
        ((float) ($existing['default_price'] ?? 0)) !== ($price ?? 0)
    );

    $pdo->prepare(
        'UPDATE products SET
            product_name      = ?,
            product_code      = ?,
            category          = ?,
            mrp               = ?,
            default_price     = ?,
            is_active         = 1,
            last_synced_at    = ?,
            sync_source       = ?,
            last_price_change = ?
         WHERE id = ?'
    )->execute([
        $name,
        $code,
        $category,
        $mrp,
        $price,
        $now,
        $sourceId,
        $priceChanged ? $now : $existing['last_price_change'],
        (int) $existing['id'],
    ]);

    return $priceChanged ? 'price_changed' : 'updated';
}

/**
 * Find an existing system product (user_id IS NULL) by code or name.
 */
function findExistingSystemProduct(PDO $pdo, ?string $code, string $name): ?array
{
    if ($code !== null) {
        $stmt = $pdo->prepare(
            'SELECT id, mrp, default_price, last_price_change
               FROM products
              WHERE user_id IS NULL AND product_code = ? LIMIT 1'
        );
        $stmt->execute([$code]);
        $row = $stmt->fetch();
        if ($row) { return $row; }
    }

    // Fallback: match by exact product_name (case-insensitive via utf8mb4 collation)
    $stmt = $pdo->prepare(
        'SELECT id, mrp, default_price, last_price_change
           FROM products
          WHERE user_id IS NULL AND product_name = ? LIMIT 1'
    );
    $stmt->execute([$name]);
    return $stmt->fetch() ?: null;
}

/**
 * Soft-deletes system products from this source that are no longer in the feed.
 * Only deactivates products tracked with the same sync_source.
 */
function deactivateStaleProducts(PDO $pdo, array $incomingKeys, string $sourceId, string $now): void
{
    // Build a unique key list: code if available, else product_name
    if (empty($incomingKeys)) { return; }

    $placeholders = implode(',', array_fill(0, count($incomingKeys), '?'));
    $params       = array_merge([$sourceId], $incomingKeys);

    // Fetch all active system products from this source
    $stmt = $pdo->prepare(
        "SELECT id, COALESCE(product_code, product_name) AS key_val
           FROM products
          WHERE user_id IS NULL AND is_active = 1 AND sync_source = ?"
    );
    $stmt->execute([$sourceId]);
    $existing = $stmt->fetchAll();

    $toDeactivate = [];
    foreach ($existing as $row) {
        if (!in_array($row['key_val'], $incomingKeys, true)) {
            $toDeactivate[] = (int) $row['id'];
        }
    }

    if (empty($toDeactivate)) { return; }

    $ph = implode(',', array_fill(0, count($toDeactivate), '?'));
    $pdo->prepare("UPDATE products SET is_active = 0, last_synced_at = ? WHERE id IN ({$ph})")
        ->execute(array_merge([$now], $toDeactivate));

    syncLog('INFO', 'Deactivated ' . count($toDeactivate) . ' stale product(s) no longer in source.');
}

function resolveKey(array $item): ?string
{
    $code = isset($item['product_code']) && trim((string) $item['product_code']) !== ''
            ? trim((string) $item['product_code'])
            : null;
    return $code ?? (trim((string) ($item['product_name'] ?? '')) ?: null);
}

function normalizeCategory(string $cat): string
{
    return in_array($cat, ['kitchen', 'bottle', 'storage', 'other'], true) ? $cat : 'other';
}
