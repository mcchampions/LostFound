package me.qscbm.projects.lostfound.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.qscbm.projects.lostfound.entity.Message;
import me.qscbm.projects.lostfound.entity.User;
import me.qscbm.projects.lostfound.entity.UserEmailPreference;
import me.qscbm.projects.lostfound.mapper.MessageMapper;
import me.qscbm.projects.lostfound.mapper.UserEmailPreferenceMapper;
import me.qscbm.projects.lostfound.mapper.UserMapper;
import me.qscbm.projects.lostfound.service.WebSocketPresenceService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Scheduled task that sends unread message digest emails to offline users.
 * Runs every 3 minutes. Users who are online or have been notified within
 * the last 3 minutes are skipped.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MessageDigestMailTask {

    private final UserEmailPreferenceMapper emailPreferenceMapper;
    private final UserMapper userMapper;
    private final MessageMapper messageMapper;
    private final JavaMailSender mailSender;
    private final WebSocketPresenceService presenceService;

    @Value("${spring.mail.username:}")
    private String mailFrom;

    @Scheduled(fixedRate = 180_000)
    public void sendUnreadMessageDigest() {
        List<UserEmailPreference> prefs = emailPreferenceMapper.selectList(
                new LambdaQueryWrapper<UserEmailPreference>()
                        .eq(UserEmailPreference::getMessage, 1));

        if (prefs.isEmpty()) return;

        LocalDateTime cutoff = LocalDateTime.now().minusMinutes(3);
        int batchSize = 0;
        int maxBatch = 100;

        for (UserEmailPreference pref : prefs) {
            if (batchSize >= maxBatch) break;

            // Skip if recently notified
            if (pref.getLastMessageNotifiedAt() != null
                    && pref.getLastMessageNotifiedAt().isAfter(cutoff)) {
                continue;
            }

            // Skip if user is currently online
            if (presenceService.isOnline(pref.getUserId())) {
                continue;
            }

            User user = userMapper.selectById(pref.getUserId());
            if (user == null
                    || !"ACTIVE".equals(user.getStatus())
                    || user.getEmailVerified() == null
                    || user.getEmailVerified() != 1
                    || user.getEmail() == null
                    || user.getEmail().isBlank()) {
                continue;
            }

            Long unreadCount = messageMapper.selectCount(
                    new LambdaQueryWrapper<Message>()
                            .eq(Message::getReceiverId, pref.getUserId())
                            .eq(Message::getIsRead, 0));

            if (unreadCount == null || unreadCount == 0) {
                continue;
            }

            try {
                String subject = "校园失物招领 - 您有 " + unreadCount + " 条未读消息";
                String content = "您在校园失物招领系统中有 " + unreadCount
                        + " 条未读消息，请登录查看。";
                sendMail(user.getEmail(), subject, content);

                pref.setLastMessageNotifiedAt(LocalDateTime.now());
                emailPreferenceMapper.updateById(pref);
                batchSize++;
            } catch (Exception e) {
                log.error("消息摘要邮件发送失败, userId={}", pref.getUserId(), e);
            }
        }

        if (batchSize > 0) {
            log.info("消息摘要邮件发送完成, 共发送 {} 封", batchSize);
        }
    }

    private void sendMail(String recipient, String subject, String content) {
        SimpleMailMessage message = new SimpleMailMessage();
        if (mailFrom != null && !mailFrom.isBlank()) {
            message.setFrom(mailFrom);
        }
        message.setTo(recipient);
        message.setSubject(subject);
        message.setText(content);
        mailSender.send(message);
    }
}
