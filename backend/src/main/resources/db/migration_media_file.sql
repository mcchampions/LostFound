CREATE TABLE IF NOT EXISTS `media_file` (
    `url` VARCHAR(500) NOT NULL,
    `owner_id` BIGINT NOT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`url`),
    KEY `idx_media_owner_created` (`owner_id`, `created_at`),
    CONSTRAINT `fk_media_owner` FOREIGN KEY (`owner_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `media_file` (`url`, `owner_id`)
SELECT `cover_image`, `user_id` FROM `lost_item`
WHERE `cover_image` IS NOT NULL AND `cover_image` LIKE '/uploads/%';

INSERT IGNORE INTO `media_file` (`url`, `owner_id`)
SELECT `cover_image`, `user_id` FROM `found_item`
WHERE `cover_image` IS NOT NULL AND `cover_image` LIKE '/uploads/%';

INSERT IGNORE INTO `media_file` (`url`, `owner_id`)
SELECT jt.`url`, li.`user_id`
FROM `lost_item` li,
JSON_TABLE(
    IF(JSON_VALID(li.`image_urls`), li.`image_urls`, JSON_ARRAY()),
    '$[*]' COLUMNS (`url` VARCHAR(500) PATH '$')
) jt
WHERE jt.`url` LIKE '/uploads/%';

INSERT IGNORE INTO `media_file` (`url`, `owner_id`)
SELECT jt.`url`, fi.`user_id`
FROM `found_item` fi,
JSON_TABLE(
    IF(JSON_VALID(fi.`image_urls`), fi.`image_urls`, JSON_ARRAY()),
    '$[*]' COLUMNS (`url` VARCHAR(500) PATH '$')
) jt
WHERE jt.`url` LIKE '/uploads/%';

INSERT IGNORE INTO `media_file` (`url`, `owner_id`)
SELECT jt.`url`, ca.`applicant_id`
FROM `claim_application` ca,
JSON_TABLE(
    IF(JSON_VALID(ca.`image_urls`), JSON_ARRAY(ca.`image_urls`), JSON_ARRAY()),
    '$[*]' COLUMNS (`url` VARCHAR(500) PATH '$')
) jt
WHERE jt.`url` LIKE '/uploads/%';
