-- 010_create_products.sql
-- Product master table (Feature 2 — Product Master + Searchable Product Picker).
--
-- TENANT RULES:
--   user_id IS NULL  → system product managed by admin via DB — visible to ALL sellers
--   user_id = N      → seller-custom product — visible only to that seller
--
-- Admin adds system products directly through phpMyAdmin / DB migration.
-- No sync engine. No CSV. No Google Sheet. Simple and cheap-hosting safe.
--
-- BACKWARD COMPATIBLE: no changes to existing tables.

CREATE TABLE IF NOT EXISTS `products` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id`       BIGINT UNSIGNED DEFAULT NULL
                    COMMENT 'NULL = admin system product; set = seller-custom',
  `product_name`  VARCHAR(160) NOT NULL,
  `product_code`  VARCHAR(60)  DEFAULT NULL,
  `category`      ENUM('kitchen','bottle','storage','other') NOT NULL DEFAULT 'other',
  `mrp`           DECIMAL(10,2) DEFAULT NULL,
  `default_price` DECIMAL(10,2) DEFAULT NULL,
  `image_url`     VARCHAR(500)  DEFAULT NULL,
  `is_active`     TINYINT(1)    NOT NULL DEFAULT 1,
  `created_at`    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_products_user`   (`user_id`),
  KEY `idx_products_name`   (`product_name`),
  KEY `idx_products_code`   (`product_code`),
  KEY `idx_products_active` (`is_active`),
  CONSTRAINT `fk_products_user`
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
