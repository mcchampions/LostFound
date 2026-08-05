package me.qscbm.projects.lostfound.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.qscbm.projects.lostfound.entity.User;
import me.qscbm.projects.lostfound.entity.UserEmailPreference;
import me.qscbm.projects.lostfound.entity.enums.UserStatus;
import me.qscbm.projects.lostfound.mapper.UserEmailPreferenceMapper;
import me.qscbm.projects.lostfound.mapper.UserMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class AsyncMailSender {

    private final UserMapper userMapper;
    private final UserEmailPreferenceMapper emailPreferenceMapper;
    private final JavaMailSender mailSender;
    private final EmailContentBuilder emailContentBuilder;
    private final EmailRetryQueue emailRetryQueue;

    @Value("${spring.mail.username:}")
    private String mailFrom;

    @Async("mailTaskExecutor")
    public void sendUserNotification(Long userId, String subject, String content, String preferenceKey) {
        User user = userMapper.selectById(userId);
        if (!canReceiveEmail(user, preferenceKey)) {
            return;
        }
        String[] action = actionFor(preferenceKey);
        send(user.getEmail(), subject, content, action[0], action[1]);
    }

    @Async("mailTaskExecutor")
    public void sendAnnouncement(String title, String content) {
        List<User> users = userMapper.selectList(
                new LambdaQueryWrapper<User>()
                        .eq(User::getStatus, UserStatus.ACTIVE.getValue())
                        .eq(User::getEmailVerified, true)
                        .isNotNull(User::getEmail));
        for (User user : users) {
            if (canReceiveEmail(user, "announcement")) {
                send(user.getEmail(), "校园失物招领 - 新公告：" + title, content,
                        "查看公告", "/");
            }
        }
    }

    private String[] actionFor(String preferenceKey) {
        return switch (preferenceKey) {
            case "claim_request" -> new String[]{"查看认领申请", "/claims"};
            case "claim_result" -> new String[]{"查看认领结果", "/claims"};
            default -> new String[]{null, null};
        };
    }

    /**
     * Checks whether a user can receive a specific type of email notification.
     * Falls back to the legacy notify_email flag when no preference record exists.
     */
    boolean canReceiveEmail(User user, String preferenceKey) {
        if (user == null
                || !UserStatus.ACTIVE.getValue().equals(user.getStatus())
                || !Boolean.TRUE.equals(user.getEmailVerified())
                || user.getEmail() == null
                || user.getEmail().isBlank()) {
            return false;
        }
        // system emails are always allowed
        if ("system_message".equals(preferenceKey)) {
            return true;
        }
        UserEmailPreference pref = emailPreferenceMapper.selectById(user.getId());
        if (pref == null) {
            // No preference record: fall back to legacy notify_email flag
            return Boolean.TRUE.equals(user.getNotifyEmail());
        }
        Boolean enabled = switch (preferenceKey) {
            case "claim_request" -> pref.getClaimRequest();
            case "claim_result" -> pref.getClaimResult();
            case "announcement" -> pref.getAnnouncement();
            case "message" -> pref.getMessage();
            default -> user.getNotifyEmail();
        };
        return Boolean.TRUE.equals(enabled);
    }

    private void send(String recipient, String subject, String content,
                      String actionText, String actionUrl) {
        try {
            EmailMessageComposer.send(mailSender, mailFrom, recipient, subject,
                    emailContentBuilder.plainBody(content, actionText, actionUrl),
                    emailContentBuilder.htmlBody(content, actionText, actionUrl));
        } catch (Exception e) {
            log.error("邮件发送失败，recipient={}, subject={}", recipient, subject, e);
            emailRetryQueue.enqueue(recipient, subject, content, actionText, actionUrl);
        }
    }
}
