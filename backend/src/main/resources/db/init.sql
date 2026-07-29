-- Lost & Found System Database Initialization
-- Database: lost_found
-- Usage: mysql -u root -p lost_found < init.sql
-- Note: This script is idempotent — safe to run multiple times

-- ============================================================
-- 1. User table
-- ============================================================
CREATE TABLE IF NOT EXISTS `user` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(50) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `real_name` VARCHAR(50) DEFAULT NULL,
    `role` VARCHAR(20) NOT NULL DEFAULT 'STUDENT',
    `email` VARCHAR(100) DEFAULT NULL,
    `phone` VARCHAR(20) DEFAULT NULL,
    `avatar` VARCHAR(500) DEFAULT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    `email_verified` TINYINT DEFAULT 0,
    `notify_email` TINYINT DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_username` (`username`),
    UNIQUE KEY `uk_user_email` (`email`),
    KEY `idx_role` (`role`),
    KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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

-- ============================================================
-- 2. Category table
-- ============================================================
CREATE TABLE IF NOT EXISTS `category` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `sort_order` INT DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 3. Lost item table
-- ============================================================
CREATE TABLE IF NOT EXISTS `lost_item` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT,
    `category_id` BIGINT DEFAULT NULL,
    `location` VARCHAR(200) DEFAULT NULL,
    `lost_time` DATETIME DEFAULT NULL,
    `image_urls` TEXT DEFAULT NULL,
    `cover_image` VARCHAR(500) DEFAULT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'LOST',
    `resolved_by` BIGINT DEFAULT NULL,
    `resolved_type` VARCHAR(20) DEFAULT NULL,
    `resolved_note` VARCHAR(1000) DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_category_id` (`category_id`),
    KEY `idx_status` (`status`),
    KEY `idx_lost_time` (`lost_time`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 4. Found item table
-- ============================================================
CREATE TABLE IF NOT EXISTS `found_item` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `description` TEXT,
    `category_id` BIGINT DEFAULT NULL,
    `location` VARCHAR(200) DEFAULT NULL,
    `found_time` DATETIME DEFAULT NULL,
    `image_urls` TEXT DEFAULT NULL,
    `cover_image` VARCHAR(500) DEFAULT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'UNCLAIMED',
    `resolved_by` BIGINT DEFAULT NULL,
    `resolved_type` VARCHAR(20) DEFAULT NULL,
    `resolved_note` VARCHAR(1000) DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_category_id` (`category_id`),
    KEY `idx_status` (`status`),
    KEY `idx_found_time` (`found_time`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 5. Claim application table
-- ============================================================
CREATE TABLE IF NOT EXISTS `claim_application` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `item_type` VARCHAR(20) NOT NULL COMMENT 'LOST or FOUND',
    `item_id` BIGINT NOT NULL,
    `applicant_id` BIGINT NOT NULL,
    `publisher_id` BIGINT NOT NULL,
    `message` TEXT,
    `image_urls` TEXT DEFAULT NULL,
    `status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_item` (`item_type`, `item_id`),
    KEY `idx_applicant_id` (`applicant_id`),
    KEY `idx_publisher_id` (`publisher_id`),
    KEY `idx_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 6. Notification table
-- ============================================================
CREATE TABLE IF NOT EXISTS `notification` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT NOT NULL,
    `title` VARCHAR(200) NOT NULL,
    `content` TEXT,
    `type` VARCHAR(50) DEFAULT NULL,
    `related_id` BIGINT DEFAULT NULL,
    `related_type` VARCHAR(50) DEFAULT NULL,
    `is_read` TINYINT DEFAULT 0,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_is_read` (`is_read`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 7. Announcement table
-- ============================================================
CREATE TABLE IF NOT EXISTS `announcement` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(200) NOT NULL,
    `content` TEXT,
    `publisher_id` BIGINT DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_publisher_id` (`publisher_id`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 8. Operation log table
-- ============================================================
CREATE TABLE IF NOT EXISTS `operation_log` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT DEFAULT NULL,
    `action` VARCHAR(50) NOT NULL,
    `target_type` VARCHAR(50) DEFAULT NULL,
    `target_id` BIGINT DEFAULT NULL,
    `description` VARCHAR(500) DEFAULT NULL,
    `ip` VARCHAR(50) DEFAULT NULL,
    `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_user_id` (`user_id`),
    KEY `idx_action` (`action`),
    KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- 9. System config table
-- ============================================================
CREATE TABLE IF NOT EXISTS `system_config` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `config_key` VARCHAR(100) NOT NULL,
    `config_value` VARCHAR(500) DEFAULT NULL,
    `description` VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uk_config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Seed Data (INSERT IGNORE ensures idempotency)
-- ============================================================

-- Default categories
INSERT IGNORE INTO `category` (`name`, `sort_order`) VALUES
('电子产品', 1),
('书籍', 2),
('衣物', 3),
('钥匙', 4),
('钱包', 5),
('证件', 6),
('生活用品', 7),
('其他', 8);

-- Admin user (password: admin123, BCrypt encoded)
INSERT IGNORE INTO `user` (`username`, `password`, `real_name`, `role`, `status`) VALUES
('admin', '$2b$12$yc3GuLnfzn9w50H4VOidV.S3X3fLN0bWKbO7YZmScJrKEzYoLWwXi', '系统管理员', 'ADMIN', 'ACTIVE');

-- System configuration
INSERT IGNORE INTO `system_config` (`config_key`, `config_value`, `description`) VALUES
('site_name', '校园失物招领系统', 'Site name'),
('org_name', '某某中学', 'Organization name'),
('contact_phone', '010-12345678', 'Contact phone number');
