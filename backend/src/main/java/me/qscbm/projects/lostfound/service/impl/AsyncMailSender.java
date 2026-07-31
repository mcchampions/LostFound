package me.qscbm.projects.lostfound.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.qscbm.projects.lostfound.entity.User;
import me.qscbm.projects.lostfound.entity.UserEmailPreference;
import me.qscbm.projects.lostfound.mapper.UserEmailPreferenceMapper;
import me.qscbm.projects.lostfound.mapper.UserMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
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

    @Value("${spring.mail.username:}")
    private String mailFrom;

    @Async("mailTaskExecutor")
    public void sendUserNotification(Long userId, String subject, String content, String preferenceKey) {
        User user = userMapper.selectById(userId);
        if (!canReceiveEmail(user, preferenceKey)) {
            return;
        }
        send(user.getEmail(), subject, content);
    }

    @Async("mailTaskExecutor")
    public void sendAnnouncement(String title, String content) {
        List<User> users = userMapper.selectList(
                new LambdaQueryWrapper<User>()
                        .eq(User::getStatus, "ACTIVE")
                        .eq(User::getEmailVerified, 1)
                        .isNotNull(User::getEmail));
        for (User user : users) {
            if (canReceiveEmail(user, "announcement")) {
                send(user.getEmail(), "校园失物招领 - 新公告：" + title, content);
            }
        }
    }

    /**
     * Checks whether a user can receive a specific type of email notification.
     * Falls back to the legacy notify_email flag when no preference record exists.
     */
    boolean canReceiveEmail(User user, String preferenceKey) {
        if (user == null
                || !"ACTIVE".equals(user.getStatus())
                || user.getEmailVerified() == null
                || user.getEmailVerified() != 1
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
            return user.getNotifyEmail() != null && user.getNotifyEmail() == 1;
        }
        Integer enabled = switch (preferenceKey) {
            case "claim_request" -> pref.getClaimRequest();
            case "claim_result" -> pref.getClaimResult();
            case "announcement" -> pref.getAnnouncement();
            case "message" -> pref.getMessage();
            default -> user.getNotifyEmail();
        };
        return enabled != null && enabled == 1;
    }

    private void send(String recipient, String subject, String content) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            if (mailFrom != null && !mailFrom.isBlank()) {
                message.setFrom(mailFrom);
            }
            message.setTo(recipient);
            message.setSubject(subject);
            message.setText(content);
            mailSender.send(message);
        } catch (Exception e) {
            log.error("邮件发送失败，recipient={}, subject={}", recipient, subject, e);
        }
    }
}
