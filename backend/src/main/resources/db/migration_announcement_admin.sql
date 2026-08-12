ALTER TABLE `announcement`
    ADD COLUMN `is_pinned` TINYINT NOT NULL DEFAULT 0 AFTER `content`;

ALTER TABLE `announcement`
    ADD COLUMN `is_active` TINYINT NOT NULL DEFAULT 1 AFTER `is_pinned`;

ALTER TABLE `announcement`
    ADD INDEX `idx_announcement_active_pinned` (`is_active`, `is_pinned`, `created_at`);
