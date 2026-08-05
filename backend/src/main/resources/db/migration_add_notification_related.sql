ALTER TABLE `notification`
    ADD COLUMN `related_id` BIGINT DEFAULT NULL;

ALTER TABLE `notification`
    ADD COLUMN `related_type` VARCHAR(50) DEFAULT NULL;
