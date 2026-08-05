ALTER TABLE `lost_item`
    ADD COLUMN `resolved_by` BIGINT DEFAULT NULL;

ALTER TABLE `lost_item`
    ADD COLUMN `resolved_type` VARCHAR(20) DEFAULT NULL;

ALTER TABLE `found_item`
    ADD COLUMN `resolved_by` BIGINT DEFAULT NULL;

ALTER TABLE `found_item`
    ADD COLUMN `resolved_type` VARCHAR(20) DEFAULT NULL;

ALTER TABLE `user`
    ADD COLUMN `email_verified` TINYINT DEFAULT 0;

ALTER TABLE `user`
    ADD COLUMN `notify_email` TINYINT DEFAULT 0;
