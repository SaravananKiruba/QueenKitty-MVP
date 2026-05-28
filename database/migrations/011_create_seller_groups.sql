-- 011_create_seller_groups.sql
-- Seller groups table for multi-product-category SaaS platform.
--
-- PURPOSE:
--   QueenKitty serves MULTIPLE independent seller communities:
--   - Group A: Tupperware sellers (15 sellers)
--   - Group B: Computer parts sellers (10 sellers)
--   - Group C: Cosmetics sellers (20 sellers)
--
-- RULES:
--   - Created by super admin only
--   - Each group has one owner (group_id → users.id as owner_user_id)
--   - Products scoped to groups (products.group_id → seller_groups.id)
--   - MLM hierarchy exists WITHIN each group
--   - Data isolation BETWEEN groups

CREATE TABLE IF NOT EXISTS `seller_groups` (
  `id`            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name`          VARCHAR(100)    NOT NULL
                    COMMENT 'Group name (e.g., "Tupperware Sellers Chennai")',
  `description`   TEXT            DEFAULT NULL
                    COMMENT 'Group description/details',
  `owner_user_id` BIGINT UNSIGNED DEFAULT NULL
                    COMMENT 'Group admin/owner (senior seller managing this group)',
  `category`      VARCHAR(50)     DEFAULT NULL
                    COMMENT 'Product category (e.g., "tupperware", "computer_parts", "cosmetics")',
  `is_active`     TINYINT(1)      NOT NULL DEFAULT 1,
  `created_at`    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at`    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_seller_groups_owner`    (`owner_user_id`),
  KEY `idx_seller_groups_category` (`category`),
  KEY `idx_seller_groups_active`   (`is_active`),
  CONSTRAINT `fk_seller_groups_owner`
    FOREIGN KEY (`owner_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
