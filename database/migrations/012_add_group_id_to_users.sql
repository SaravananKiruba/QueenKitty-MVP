-- 012_add_group_id_to_users.sql
-- Add group membership to users table.
--
-- RULES:
--   - Every seller/leader MUST belong to a seller group
--   - Admin users: group_id = NULL (platform-wide access)
--   - Seller/Leader: group_id = REQUIRED
--   - MLM hierarchy (parent_user_id) exists WITHIN same group

ALTER TABLE `users`
ADD COLUMN `group_id` BIGINT UNSIGNED DEFAULT NULL
  COMMENT 'Seller group membership (NULL for admin)' AFTER `parent_user_id`;

ALTER TABLE `users`
ADD KEY `idx_users_group` (`group_id`);

ALTER TABLE `users`
ADD CONSTRAINT `fk_users_group`
  FOREIGN KEY (`group_id`) REFERENCES `seller_groups`(`id`) ON DELETE RESTRICT;
