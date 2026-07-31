-- Password reset: stores a short-lived verification code per user
CREATE TABLE IF NOT EXISTS `password_reset_code` (
    `user_id` BIGINT NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `code_hash` VARCHAR(255) NOT NULL,
    `sent_at` BIGINT NOT NULL,
    `expires_at` BIGINT NOT NULL,
    `attempts` INT NOT NULL DEFAULT 0,
    PRIMARY KEY (`user_id`),
    CONSTRAINT `fk_password_reset_user`
        FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
