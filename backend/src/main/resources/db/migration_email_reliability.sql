CREATE TABLE IF NOT EXISTS `email_verification_code` (
    `user_id` BIGINT NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `code_hash` VARCHAR(255) NOT NULL,
    `sent_at` BIGINT NOT NULL,
    `expires_at` BIGINT NOT NULL,
    `attempts` INT NOT NULL DEFAULT 0,
    PRIMARY KEY (`user_id`),
    CONSTRAINT `fk_email_verification_user`
        FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

UPDATE `user`
SET `email` = NULL,
    `email_verified` = 0,
    `notify_email` = 0
WHERE `email` IS NOT NULL
  AND TRIM(`email`) = '';

UPDATE `user`
SET `email` = LOWER(TRIM(`email`))
WHERE `email` IS NOT NULL
  AND `email` <> LOWER(TRIM(`email`));

UPDATE `user` AS duplicate_user
JOIN `user` AS keeper
  ON duplicate_user.`email` = keeper.`email`
 AND duplicate_user.`id` > keeper.`id`
SET duplicate_user.`email` = NULL,
    duplicate_user.`email_verified` = 0,
    duplicate_user.`notify_email` = 0
WHERE duplicate_user.`email` IS NOT NULL;

ALTER TABLE `user` ADD UNIQUE KEY `uk_user_email` (`email`);
