-- Migration: Add time range end columns to lost_item and found_item tables
-- Allows specifying a time range (e.g., lost between 14:00 and 16:00) instead of a single point

ALTER TABLE `lost_item` ADD COLUMN `lost_time_end` DATETIME DEFAULT NULL AFTER `lost_time`;
ALTER TABLE `found_item` ADD COLUMN `found_time_end` DATETIME DEFAULT NULL AFTER `found_time`;
