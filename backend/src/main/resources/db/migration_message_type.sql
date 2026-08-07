ALTER TABLE `message`
    ADD COLUMN `message_type` VARCHAR(20) NOT NULL DEFAULT 'USER' AFTER `content`;

UPDATE `message`
SET `message_type` = 'NARRATION'
WHERE `content` = '认领申请已通过，现在可以开始对话了。';

ALTER TABLE `message`
    ADD INDEX `idx_message_pair_type` (`sender_id`, `receiver_id`, `message_type`);

ALTER TABLE `message`
    ADD CONSTRAINT `chk_message_type`
        CHECK (`message_type` IN ('USER', 'NARRATION'));
