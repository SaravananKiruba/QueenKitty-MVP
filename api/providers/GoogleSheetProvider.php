<?php
/**
 * GoogleSheetProvider
 * Fetches products from a published Google Sheet (CSV export URL).
 *
 * How to prepare the Google Sheet:
 *   1. File → Share → Publish to web → CSV → Copy link
 *   2. The link looks like:
 *      https://docs.google.com/spreadsheets/d/SHEET_ID/export?format=csv&gid=0
 *   3. Put that URL in PRODUCT_SHEET_URL in /api/config/.env
 *
 * Expected sheet columns (row 1 = header, any order):
 *   product_name  (required)
 *   product_code  (optional)
 *   category      kitchen|bottle|storage|other (optional, defaults to "other")
 *   mrp           (optional numeric)
 *   default_price (optional numeric)
 *
 * Column names are case-insensitive.
 * Extra columns are ignored safely.
 *
 * NO headless browser. NO Puppeteer. Pure PHP + file_get_contents.
 * Shared-hosting compatible.
 */

declare(strict_types=1);

require_once __DIR__ . '/ProductProviderInterface.php';

final class GoogleSheetProvider implements ProductProviderInterface
{
    private string $csvUrl;

    public function __construct(string $csvUrl)
    {
        $this->csvUrl = $csvUrl;
    }

    public function fetchProducts(): array
    {
        $context = stream_context_create([
            'http' => [
                'method'          => 'GET',
                'timeout'         => 15,
                'follow_location' => 1,
                'user_agent'      => 'QueenKitty-ProductSync/1.0',
            ],
            'ssl' => [
                'verify_peer'      => true,
                'verify_peer_name' => true,
            ],
        ]);

        $raw = @file_get_contents($this->csvUrl, false, $context);
        if ($raw === false) {
            throw new RuntimeException('GoogleSheetProvider: failed to fetch CSV from URL');
        }

        return $this->parseCsv($raw);
    }

    public function sourceIdentifier(): string
    {
        // Extract just enough to identify the sheet without leaking the full URL.
        if (preg_match('/spreadsheets\/d\/([^\/]+)/', $this->csvUrl, $m)) {
            return 'google_sheet:' . $m[1];
        }
        return 'google_sheet:unknown';
    }

    // ── Private helpers ──────────────────────────────────────────────────────

    private function parseCsv(string $raw): array
    {
        // Normalize line endings
        $raw   = str_replace("\r\n", "\n", str_replace("\r", "\n", $raw));
        $lines = array_filter(explode("\n", trim($raw)), fn($l) => trim($l) !== '');

        if (count($lines) < 2) {
            return []; // Only header or empty
        }

        // Parse header row — map lowercased column name → column index
        $header = $this->parseCsvLine(array_shift($lines));
        $colMap = [];
        foreach ($header as $i => $name) {
            $colMap[strtolower(trim($name))] = $i;
        }

        $required = ['product_name'];
        foreach ($required as $col) {
            if (!array_key_exists($col, $colMap)) {
                throw new RuntimeException(
                    "GoogleSheetProvider: missing required column '{$col}' in sheet header"
                );
            }
        }

        $products = [];
        foreach ($lines as $line) {
            $cells = $this->parseCsvLine($line);
            $row   = $this->mapRow($cells, $colMap);
            if ($row !== null) {
                $products[] = $row;
            }
        }

        return $products;
    }

    private function mapRow(array $cells, array $colMap): ?array
    {
        $get = function (string $key) use ($cells, $colMap): ?string {
            if (!isset($colMap[$key])) { return null; }
            $val = trim($cells[$colMap[$key]] ?? '');
            return $val !== '' ? $val : null;
        };

        $name = $get('product_name');
        if ($name === null || mb_strlen($name) < 2) {
            return null; // Skip blank/invalid rows silently
        }

        $category = $get('category');
        if (!in_array($category, ['kitchen', 'bottle', 'storage', 'other'], true)) {
            $category = 'other';
        }

        $mrp   = $get('mrp');
        $price = $get('default_price') ?? $get('price') ?? $get('selling_price');

        return [
            'product_name'  => $name,
            'product_code'  => $get('product_code') ?? $get('sku') ?? $get('code'),
            'category'      => $category,
            'mrp'           => $mrp   !== null ? (float) $mrp   : null,
            'default_price' => $price !== null ? (float) $price : null,
        ];
    }

    /** Minimal RFC 4180 CSV parser — handles quoted fields with commas/newlines. */
    private function parseCsvLine(string $line): array
    {
        // Use PHP's built-in str_getcsv for correctness
        return str_getcsv($line, ',', '"', '\\');
    }
}
