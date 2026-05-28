-- 013_add_group_id_to_products.sql
-- Add group-level product scoping to products table.
--
-- PRODUCT VISIBILITY RULES:
--   user_id = NULL, group_id = NULL  → Global product (all sellers, all groups)
--   user_id = NULL, group_id = 123   → Group product (all sellers in group 123)
--   user_id = 456,  group_id = 123   → Seller custom product (only seller 456)
--
-- QUERY LOGIC:
--   SELECT * FROM products
--   WHERE is_active = 1
--     AND (
--       (user_id IS NULL AND group_id IS NULL)     -- Global
--       OR group_id = ?                             -- Group
--       OR user_id = ?                              -- Own
--     )
--   ORDER BY
--     (user_id IS NULL AND group_id IS NULL) DESC, -- Global first
--     (group_id IS NOT NULL) DESC,                 -- Group second
--     product_name ASC

ALTER TABLE `products`
ADD COLUMN `group_id` BIGINT UNSIGNED DEFAULT NULL
  COMMENT 'NULL = global product; set = group-specific product' AFTER `user_id`;

ALTER TABLE `products`
ADD KEY `idx_products_group` (`group_id`);

ALTER TABLE `products`
ADD CONSTRAINT `fk_products_group`
  FOREIGN KEY (`group_id`) REFERENCES `seller_groups`(`id`) ON DELETE CASCADE;

-- Update existing comment for user_id to reflect new 3-tier visibility
ALTER TABLE `products`
MODIFY COLUMN `user_id` BIGINT UNSIGNED DEFAULT NULL
  COMMENT 'NULL = group/global product; set = seller-custom product';
