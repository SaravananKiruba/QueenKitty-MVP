<?php
/**
 * ProductProviderInterface
 * Pluggable adapter contract for the product sync engine (Feature 3).
 *
 * Implement this interface for each source:
 *   GoogleSheetProvider  — primary and only MVP source
 *
 * Future (post-MVP):
 *   CsvProvider, JsonProvider, TupperwareProvider
 *
 * Each provider MUST be:
 *   - Retry-safe       (duplicate rows never inserted)
 *   - Cheap-hosting-safe (no queue, no Redis, no headless browser)
 *   - Shared-hosting-compatible (PHP-only, no Node.js)
 */

declare(strict_types=1);

interface ProductProviderInterface
{
    /**
     * Fetch and return all products from the data source.
     *
     * Each returned item must contain at minimum:
     *   product_name  (string, required)
     *   product_code  (string|null, optional)
     *   category      (kitchen|bottle|storage|other)
     *   mrp           (float|null)
     *   default_price (float|null)
     *
     * @return array<int, array<string, mixed>>
     * @throws RuntimeException on connection/parse failure
     */
    public function fetchProducts(): array;

    /**
     * Human-readable identifier used in sync_source column.
     * Example: "google_sheet:sheet_id", "csv:filename.csv"
     */
    public function sourceIdentifier(): string;
}
