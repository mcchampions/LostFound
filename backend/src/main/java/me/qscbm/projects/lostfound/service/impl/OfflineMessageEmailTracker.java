package me.qscbm.projects.lostfound.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.qscbm.projects.lostfound.entity.User;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * 单机内存版「离线未读消息邮件」状态跟踪。
 *
 * <ul>
 *   <li>{@link #unreadConversations}：用户 -> 离线期间收到新消息的会话集合</li>
 *   <li>{@link #emailSentStatus}：true=本轮已发过/正在发送摘要邮件，不再收集；
 *       无状态（或 false）= 可以收集</li>
 * </ul>
 *
 * 同一轮离线只提醒一次：发送成功后状态置为 true；用户上线或超过 24 小时后
 * 状态被重置，新一轮消息才可再次触发提醒。多实例部署需替换为 Redis 并加锁，
 * 此处按单机实现。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OfflineMessageEmailTracker {

    private final ConcurrentHashMap<Long, Set<String>> unreadConversations = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Long, Boolean> emailSentStatus = new ConcurrentHashMap<>();

    private final AsyncMailSender asyncMailSender;

    /**
     * 离线收件人收到新消息时调用：
     * 本轮已提醒则跳过；未提醒且用户有邮件资格时，把会话 ID 加入收集集合。
     */
    public void collectIfEligible(User user, String conversationId) {
        if (user == null || user.getId() == null
                || conversationId == null || conversationId.isBlank()) {
            return;
        }
        if (Boolean.TRUE.equals(emailSentStatus.get(user.getId()))) {
            log.debug("离线邮件:userId={} 本轮已提醒,跳过收集 conversationId={}",
                    user.getId(), conversationId);
            return;
        }
        if (!asyncMailSender.canReceiveEmail(user, "message")) {
            log.debug("离线邮件:userId={} 不满足邮件资格,跳过收集 conversationId={}",
                    user.getId(), conversationId);
            return;
        }
        Set<String> conversations = unreadConversations.computeIfAbsent(
                user.getId(), key -> ConcurrentHashMap.newKeySet());
        conversations.add(conversationId);
        log.debug("离线邮件:userId={} 收集会话 conversationId={},当前会话数={}",
                user.getId(), conversationId, conversations.size());
    }

    /** 浅拷贝 key 集合，供定时任务遍历（value 集合用完即随 key 移除，无需拷贝）。 */
    public List<Long> snapshotUserIds() {
        return new ArrayList<>(unreadConversations.keySet());
    }

    /** 读取某用户已收集的会话集合（线程安全集合，遍历时弱一致）。 */
    public Set<String> conversationIdsOf(Long userId) {
        return unreadConversations.get(userId);
    }

    /**
     * 发送前抢占状态：返回 true 表示本轮尚未发送（同时置为 true 停止继续收集），
     * 返回 false 表示本轮已发送或正在发送，调用方应跳过。
     */
    public boolean tryMarkSending(Long userId) {
        return emailSentStatus.putIfAbsent(userId, true) == null;
    }

    /** 发送成功后调用：移除收集状态，保持 emailSentStatus=true（本轮不再提醒）。 */
    public void markSent(Long userId) {
        unreadConversations.remove(userId);
        emailSentStatus.put(userId, true);
    }

    /** 用户上线时调用：移除已提醒状态，允许下一轮收集。 */
    public void resetStatus(Long userId) {
        if (userId == null) {
            return;
        }
        emailSentStatus.remove(userId);
        log.debug("离线邮件:userId={} 上线,重置提醒状态", userId);
    }

    /** 校验用户是否具备接收 message 类邮件资格（ACTIVE + 邮箱已验证 + 偏好开启）。 */
    public boolean isEligible(User user) {
        return asyncMailSender.canReceiveEmail(user, "message");
    }

    /** 已无未读消息时清理收集状态，并恢复可收集，便于下一轮直接触发。 */
    public void clearPending(Long userId) {
        unreadConversations.remove(userId);
        emailSentStatus.remove(userId);
    }

    /**
     * 每 24 小时清空状态：用户离线超过一天后，之前的「已提醒」状态失效，
     * 后续新消息可再次触发邮件提醒。
     */
    @Scheduled(fixedRateString = "${app.mail.state-clear-interval-ms:86400000}")
    public void clearAllStates() {
        int cleared = emailSentStatus.size();
        emailSentStatus.clear();
        log.info("离线邮件:状态清理完成,重置 {} 个用户的已提醒状态", cleared);
    }
}
