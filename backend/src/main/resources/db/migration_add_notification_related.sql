-- Add relation fields to notification table (used by one-click claim approve)
ALTER TABLE `notification`
    ADD COLUMN `related_id` BIGINT DEFAULT NULL,
    ADD COLUMN `related_type` VARCHAR(50) DEFAULT NULL;
