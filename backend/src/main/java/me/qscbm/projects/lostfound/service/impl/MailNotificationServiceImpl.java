package me.qscbm.projects.lostfound.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.qscbm.projects.lostfound.service.MailNotificationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
@Slf4j
@RequiredArgsConstructor
public class MailNotificationServiceImpl implements MailNotificationService {

    private final AsyncMailSender asyncMailSender;

    @Override
    public void notifyUserAfterCommit(Long userId, String subject, String content, String preferenceKey) {
        afterCommit(() -> asyncMailSender.sendUserNotification(userId, subject, content, preferenceKey));
    }

    @Override
    public void notifyAnnouncementAfterCommit(String title, String content) {
        afterCommit(() -> asyncMailSender.sendAnnouncement(title, content));
    }

    private void afterCommit(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    runSafely(action);
                }
            });
            return;
        }
        runSafely(action);
    }

    private void runSafely(Runnable action) {
        try {
            action.run();
        } catch (RuntimeException e) {
            log.error("提交异步邮件任务失败", e);
        }
    }
}
