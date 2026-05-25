-- 009_add_repeat_settings_to_users.sql
-- Feature 4: configurable repeat-order cadences per seller.
-- Defaults come straight from CLAUDE.md (kitchen 90, bottle 120, storage 180).

ALTER TABLE `users`
  ADD COLUMN `repeat_days_kitchen` SMALLINT UNSIGNED NOT NULL DEFAULT 90  AFTER `status`,
  ADD COLUMN `repeat_days_bottle`  SMALLINT UNSIGNED NOT NULL DEFAULT 120 AFTER `repeat_days_kitchen`,
  ADD COLUMN `repeat_days_storage` SMALLINT UNSIGNED NOT NULL DEFAULT 180 AFTER `repeat_days_bottle`;
