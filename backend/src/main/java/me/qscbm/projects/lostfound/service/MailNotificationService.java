package me.qscbm.projects.lostfound.service;

public interface MailNotificationService {
    void notifyUserAfterCommit(Long userId, String subject, String content, String preferenceKey);
    void notifyAnnouncementAfterCommit(String title, String content);
}
