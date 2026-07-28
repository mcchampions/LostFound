ALTER TABLE `lost_item` ADD COLUMN `resolved_note` VARCHAR(1000) DEFAULT NULL;
ALTER TABLE `found_item` ADD COLUMN `resolved_note` VARCHAR(1000) DEFAULT NULL;

ALTER TABLE `claim_application` ADD COLUMN `pending_key` VARCHAR(100)
    GENERATED ALWAYS AS (
        CASE
            WHEN `status` = 'PENDING'
            THEN CONCAT(`item_type`, ':', `item_id`, ':', `applicant_id`)
            ELSE NULL
        END
    ) STORED;

ALTER TABLE `claim_application`
    ADD UNIQUE KEY `uk_claim_pending` (`pending_key`);

ALTER TABLE `lost_item`
    ADD INDEX `idx_lost_filter` (`status`, `category_id`, `created_at`);
ALTER TABLE `found_item`
    ADD INDEX `idx_found_filter` (`status`, `category_id`, `created_at`);
ALTER TABLE `claim_application`
    ADD INDEX `idx_claim_received` (`publisher_id`, `status`, `created_at`);
ALTER TABLE `claim_application`
    ADD INDEX `idx_claim_sent` (`applicant_id`, `status`, `created_at`);
ALTER TABLE `notification`
    ADD INDEX `idx_notification_user_read_time` (`user_id`, `is_read`, `created_at`);
ALTER TABLE `message`
    ADD INDEX `idx_message_conversation_time` (`conversation_id`, `created_at`, `id`);
ALTER TABLE `message`
    ADD INDEX `idx_message_receiver_read` (`receiver_id`, `is_read`, `conversation_id`);

ALTER TABLE `lost_item`
    ADD CONSTRAINT `fk_lost_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`);
ALTER TABLE `lost_item`
    ADD CONSTRAINT `fk_lost_category` FOREIGN KEY (`category_id`) REFERENCES `category` (`id`) ON DELETE SET NULL;
ALTER TABLE `found_item`
    ADD CONSTRAINT `fk_found_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`);
ALTER TABLE `found_item`
    ADD CONSTRAINT `fk_found_category` FOREIGN KEY (`category_id`) REFERENCES `category` (`id`) ON DELETE SET NULL;
ALTER TABLE `claim_application`
    ADD CONSTRAINT `fk_claim_applicant` FOREIGN KEY (`applicant_id`) REFERENCES `user` (`id`);
ALTER TABLE `claim_application`
    ADD CONSTRAINT `fk_claim_publisher` FOREIGN KEY (`publisher_id`) REFERENCES `user` (`id`);
ALTER TABLE `notification`
    ADD CONSTRAINT `fk_notification_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE CASCADE;
ALTER TABLE `message`
    ADD CONSTRAINT `fk_message_sender` FOREIGN KEY (`sender_id`) REFERENCES `user` (`id`);
ALTER TABLE `message`
    ADD CONSTRAINT `fk_message_receiver` FOREIGN KEY (`receiver_id`) REFERENCES `user` (`id`);
ALTER TABLE `lost_item`
    ADD CONSTRAINT `fk_lost_resolver` FOREIGN KEY (`resolved_by`) REFERENCES `user` (`id`) ON DELETE SET NULL;
ALTER TABLE `found_item`
    ADD CONSTRAINT `fk_found_resolver` FOREIGN KEY (`resolved_by`) REFERENCES `user` (`id`) ON DELETE SET NULL;
ALTER TABLE `announcement`
    ADD CONSTRAINT `fk_announcement_publisher` FOREIGN KEY (`publisher_id`) REFERENCES `user` (`id`) ON DELETE SET NULL;
ALTER TABLE `operation_log`
    ADD CONSTRAINT `fk_log_user` FOREIGN KEY (`user_id`) REFERENCES `user` (`id`) ON DELETE SET NULL;

ALTER TABLE `user`
    ADD CONSTRAINT `chk_user_role` CHECK (`role` IN ('STUDENT', 'TEACHER', 'ADMIN'));
ALTER TABLE `user`
    ADD CONSTRAINT `chk_user_status` CHECK (`status` IN ('PENDING', 'ACTIVE', 'INACTIVE'));
ALTER TABLE `lost_item`
    ADD CONSTRAINT `chk_lost_status` CHECK (`status` IN ('LOST', 'FOUND'));
ALTER TABLE `found_item`
    ADD CONSTRAINT `chk_found_status` CHECK (`status` IN ('UNCLAIMED', 'CLAIMED'));
ALTER TABLE `claim_application`
    ADD CONSTRAINT `chk_claim_status` CHECK (`status` IN ('PENDING', 'APPROVED', 'REJECTED'));
ALTER TABLE `claim_application`
    ADD CONSTRAINT `chk_claim_item_type` CHECK (`item_type` IN ('LOST', 'FOUND'));
ALTER TABLE `lost_item`
    ADD CONSTRAINT `chk_lost_resolved_type` CHECK (`resolved_type` IS NULL OR `resolved_type` IN ('SELF', 'USER', 'OTHER'));
ALTER TABLE `found_item`
    ADD CONSTRAINT `chk_found_resolved_type` CHECK (`resolved_type` IS NULL OR `resolved_type` IN ('SELF', 'USER', 'OTHER'));
