-- Security hardening: track last password change so tokens issued before it are rejected
ALTER TABLE `user`
    ADD COLUMN `password_changed_at` DATETIME DEFAULT NULL AFTER `password`;
