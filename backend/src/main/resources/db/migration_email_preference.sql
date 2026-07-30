-- Email preference: fine-grained notification settings per user
CREATE TABLE IF NOT EXISTS `user_email_preference` (
    `user_id` BIGINT NOT NULL,
    `claim_request` TINYINT NOT NULL DEFAULT 1,
    `claim_result` TINYINT NOT NULL DEFAULT 1,
    `announcement` TINYINT NOT NULL DEFAULT 1,
    `message` TINYINT NOT NULL DEFAULT 1,
    `system` TINYINT NOT NULL DEFAULT 1,
    `last_message_notified_at` DATETIME DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`user_id`),
    CONSTRAINT `fk_email_pref_user`
        FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Migrate existing users: those with notify_email=1 get all preferences enabled
INSERT IGNORE INTO `user_email_preference` (`user_id`, `claim_request`, `claim_result`, `announcement`, `message`, `system`)
SELECT `id`, `notify_email`, `notify_email`, `notify_email`, `notify_email`, 1
FROM `user`
WHERE `notify_email` = 1;
