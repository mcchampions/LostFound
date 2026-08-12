ALTER TABLE `lost_item`
    ADD COLUMN `deleted_at` DATETIME DEFAULT NULL AFTER `updated_at`;

ALTER TABLE `found_item`
    ADD COLUMN `deleted_at` DATETIME DEFAULT NULL AFTER `updated_at`;

ALTER TABLE `user`
    ADD COLUMN `deleted_at` DATETIME DEFAULT NULL AFTER `updated_at`;

ALTER TABLE `lost_item`
    ADD INDEX `idx_lost_deleted` (`deleted_at`);

ALTER TABLE `found_item`
    ADD INDEX `idx_found_deleted` (`deleted_at`);

ALTER TABLE `user`
    ADD INDEX `idx_user_deleted` (`deleted_at`);
