package me.qscbm.projects.lostfound.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.qscbm.projects.lostfound.entity.Message;
import me.qscbm.projects.lostfound.entity.User;
import me.qscbm.projects.lostfound.mapper.MessageMapper;
import me.qscbm.projects.lostfound.mapper.UserMapper;
import me.qscbm.projects.lostfound.service.WebSocketPresenceService;
import org.springframework.beans.factory.annotation.Value;
import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

/**
 * 定时发送「离线未读消息摘要邮件」。
 * 每 3 分钟扫描 {@link OfflineMessageEmailTracker} 中已收集的离线会话，
 * 为每个用户汇总发送一封纯文本摘要。
 *
 * 同一轮离线只提醒一次：发送成功后 emailSentStatus=true 停止收集；
 * 用户上线或超过 24 小时后状态重置，新一轮消息才可再次提醒。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class MessageDigestMailTask {

    private final OfflineMessageEmailTracker offlineTracker;
    private final UserMapper userMapper;
    private final MessageMapper messageMapper;
    private final JavaMailSender mailSender;
    private final WebSocketPresenceService presenceService;
    private final EmailContentBuilder emailContentBuilder;

    @Value("${spring.mail.username:}")
    private String mailFrom;

    @Scheduled(fixedRateString = "${app.mail.digest-interval-ms:180000}")
    public void sendUnreadMessageDigest() {
        // 只对 key 集合做浅拷贝；value 集合用完即随 key 移除，无需拷贝
        List<Long> userIds = offlineTracker.snapshotUserIds();
        if (userIds.isEmpty()) {
            return;
        }
        log.info("离线邮件:开始扫描 {} 个用户的离线未读会话", userIds.size());
        for (Long userId : userIds) {
            // 每个用户在独立虚拟线程中处理，互不阻塞
            Thread.ofVirtual()
                    .name("digest-" + userId)
                    .start(() -> processUser(userId));
        }
    }

    private void processUser(Long userId) {
        try {
            Set<String> conversations = offlineTracker.conversationIdsOf(userId);
            if (conversations == null || conversations.isEmpty()) {
                return;
            }
            // 用户当前在线：不发邮件，保留状态等待下一轮
            if (presenceService.isOnline(userId)) {
                log.debug("离线邮件:userId={} 当前在线,跳过摘要发送", userId);
                return;
            }
            // 抢占状态，防止并发重复发送；失败说明本轮已发送或正在发送
            if (!offlineTracker.tryMarkSending(userId)) {
                log.debug("离线邮件:userId={} 本轮已提醒/发送中,跳过", userId);
                return;
            }

            User user = userMapper.selectById(userId);
            if (user == null) {
                // 用户已删除：清理收集状态，避免每轮空转
                offlineTracker.clearPending(userId);
                return;
            }
            if (!offlineTracker.isEligible(user)) {
                log.debug("离线邮件:userId={} 不满足邮件资格,清理收集状态", userId);
                offlineTracker.clearPending(userId);
                return;
            }

            List<String> conversationList = new ArrayList<>(conversations);
            Long unreadCount = messageMapper.selectCount(
                    new LambdaQueryWrapper<Message>()
                            .eq(Message::getReceiverId, userId)
                            .eq(Message::getIsRead, 0)
                            .in(Message::getConversationId, conversationList));
            if (unreadCount == null || unreadCount == 0) {
                log.debug("离线邮件:userId={} 已无未读消息,清理收集状态", userId);
                offlineTracker.clearPending(userId);
                return;
            }

            String subject = "校园失物招领 - 您有 " + unreadCount + " 条未读消息";
            String summary = "您在校园失物招领系统中有 " + unreadCount + " 条未读消息（"
                    + conversationList.size() + " 个会话），点击下方按钮快速查看。";
            sendMail(user.getEmail(), subject, summary, "查看未读消息", "/chat");

            offlineTracker.markSent(userId);
            log.info("离线邮件:userId={} 摘要已发送,未读 {} 条,会话 {} 个",
                    userId, unreadCount, conversationList.size());
        } catch (Exception e) {
            offlineTracker.resetForRetry(userId);
            log.error("离线邮件:userId={} 摘要发送失败,保留待重试", userId, e);
        }
    }

    private void sendMail(String recipient, String subject, String summary,
                          String actionText, String actionUrl) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            if (mailFrom != null && !mailFrom.isBlank()) {
                helper.setFrom(mailFrom);
            }
            helper.setTo(recipient);
            helper.setSubject(subject);
            helper.setText(
                    emailContentBuilder.plainBody(summary, actionText, actionUrl),
                    emailContentBuilder.htmlBody(summary, actionText, actionUrl));
            mailSender.send(message);
        } catch (Exception e) {
            throw new IllegalStateException("摘要邮件发送失败", e);
        }
    }
}
