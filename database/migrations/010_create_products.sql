-- 010_create_products.sql
-- Product master table for Feature 2 (Product Master + Searchable Product Picker).
--
-- TENANT RULES:
--   user_id IS NULL  → system/global product (visible to all sellers, read-only)
--   user_id = N      → seller-custom product (visible to that seller only)
--
-- FK to users is conditional: enforced only when user_id IS NOT NULL.
-- Use a trigger-less workaround — FK is on the nullable column; MySQL allows
-- NULL to bypass the FK constraint, which is exactly what we need here.
--
-- BACKWARD COMPATIBLE: no changes to existing tables.

CREATE TABLE IF NOT EXISTS `products` (
  `id`                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`           BIGINT UNSIGNED DEFAULT NULL
                        COMMENT 'NULL = system product visible to all; set = seller-custom',
  `product_name`      VARCHAR(160) NOT NULL,
  `product_code`      VARCHAR(60)  DEFAULT NULL,
  `category`          ENUM('kitchen','bottle','storage','other') NOT NULL DEFAULT 'other',
  `mrp`               DECIMAL(10,2) DEFAULT NULL,
  `default_price`     DECIMAL(10,2) DEFAULT NULL,
  `image_url`         VARCHAR(500)  DEFAULT NULL,
  `source`            VARCHAR(60)   NOT NULL DEFAULT 'manual'
                        COMMENT 'manual | google_sheet | csv | json',
  `is_active`         TINYINT(1)    NOT NULL DEFAULT 1,
  `last_synced_at`    TIMESTAMP     NULL DEFAULT NULL,
  `sync_source`       VARCHAR(120)  DEFAULT NULL,
  `last_price_change` TIMESTAMP     NULL DEFAULT NULL,
  `created_at`        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`        TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_products_user`   (`user_id`),
  KEY `idx_products_name`   (`product_name`),
  KEY `idx_products_code`   (`product_code`),
  KEY `idx_products_active` (`is_active`),
  CONSTRAINT `fk_products_user`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
