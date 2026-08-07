package me.qscbm.projects.lostfound.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import me.qscbm.projects.lostfound.common.BusinessException;
import me.qscbm.projects.lostfound.dto.ConversationVO;
import me.qscbm.projects.lostfound.dto.MessageBatchVO;
import me.qscbm.projects.lostfound.dto.MessageRequest;
import me.qscbm.projects.lostfound.dto.MessageVO;
import me.qscbm.projects.lostfound.entity.Message;
import me.qscbm.projects.lostfound.entity.ClaimApplication;
import me.qscbm.projects.lostfound.entity.User;
import me.qscbm.projects.lostfound.entity.enums.ClaimStatus;
import me.qscbm.projects.lostfound.entity.enums.MessageType;
import me.qscbm.projects.lostfound.entity.enums.UserStatus;
import me.qscbm.projects.lostfound.entity.UserEmailPreference;
import me.qscbm.projects.lostfound.mapper.MessageMapper;
import me.qscbm.projects.lostfound.mapper.ClaimApplicationMapper;
import me.qscbm.projects.lostfound.mapper.UserEmailPreferenceMapper;
import me.qscbm.projects.lostfound.mapper.UserMapper;
import me.qscbm.projects.lostfound.service.MessageService;
import me.qscbm.projects.lostfound.service.SseConnectionService;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessageServiceImpl implements MessageService {

    private final MessageMapper messageMapper;
    private final ClaimApplicationMapper claimApplicationMapper;
    private final UserMapper userMapper;
    private final UserEmailPreferenceMapper emailPreferenceMapper;
    private final SseConnectionService sseConnectionService;
    private final OfflineMessageEmailTracker offlineEmailTracker;
    private final Object[] sendLocks = createSendLocks();

    @Override
    public MessageVO send(Long senderId, MessageRequest req) {
        User receiver = userMapper.selectById(req.getReceiverId());
        if (receiver == null || !UserStatus.ACTIVE.getValue().equals(receiver.getStatus())) {
            throw new BusinessException("接收用户不存在或不可用");
        }
        if (senderId.equals(req.getReceiverId())) {
            throw new BusinessException("不能给自己发送消息");
        }
        String conversationId = req.getConversationId().trim();
        if (!canSendToConversation(senderId, req.getReceiverId(), conversationId)) {
            throw new BusinessException("无权向该对话发送消息");
        }
        Message msg = new Message();
        msg.setConversationId(conversationId);
        msg.setSenderId(senderId);
        msg.setReceiverId(req.getReceiverId());
        msg.setContent(req.getContent().trim());
        msg.setMessageType(MessageType.USER.getValue());
        msg.setIsRead(false);
        synchronized (sendLock(senderId, req.getReceiverId())) {
            validateInitialMessageLimit(senderId, req.getReceiverId());
            messageMapper.insert(msg);
        }

        MessageVO vo = toVO(msg);
        sseConnectionService.sendToUser(req.getReceiverId(), SseConnectionService.MESSAGE_EVENT, vo);
        // 接收者离线时，把会话纳入离线未读邮件收集；在线则仅站内推送
        if (!sseConnectionService.isOnline(req.getReceiverId())) {
            offlineEmailTracker.collectIfEligible(receiver, conversationId);
        }
        return vo;
    }

    @Override
    public IPage<MessageVO> getMessages(Long userId, String conversationId, int page, int size) {
        if (!isParticipant(userId, conversationId)) {
            throw new BusinessException("无权访问该对话");
        }
        LambdaQueryWrapper<Message> qw = new LambdaQueryWrapper<>();
        qw.eq(Message::getConversationId, conversationId)
                .orderByAsc(Message::getCreatedAt)
                .orderByAsc(Message::getId);
        IPage<Message> messages = messageMapper.selectPage(new Page<>(page, size), qw);
        Set<Long> senderIds = messages.getRecords().stream()
                .map(Message::getSenderId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, User> senders = senderIds.isEmpty() ? Collections.emptyMap()
                : userMapper.selectBatchIds(senderIds).stream()
                .collect(Collectors.toMap(User::getId, user -> user));
        Page<MessageVO> result = new Page<>(messages.getCurrent(), messages.getSize(), messages.getTotal());
        result.setRecords(messages.getRecords().stream()
                .map(message -> toVO(message, senders))
                .toList());
        return result;
    }

    @Override
    public MessageBatchVO getLatestMessages(Long userId, String conversationId, int size) {
        return toBatch(userId, conversationId, size, null);
    }

    @Override
    public MessageBatchVO getMessagesBefore(Long userId, String conversationId, Long beforeId, int size) {
        if (beforeId == null) throw new BusinessException("消息游标不能为空");
        return toBatch(userId, conversationId, size, beforeId);
    }

    private MessageBatchVO toBatch(Long userId, String conversationId, int size, Long beforeId) {
        if (!isParticipant(userId, conversationId)) {
            throw new BusinessException("无权访问该对话");
        }
        LambdaQueryWrapper<Message> qw = new LambdaQueryWrapper<Message>()
                .eq(Message::getConversationId, conversationId);
        if (beforeId != null) qw.lt(Message::getId, beforeId);
        qw.orderByDesc(Message::getId).last("LIMIT " + Math.min(size, 100));
        List<Message> records = messageMapper.selectList(qw);
        Collections.reverse(records);
        Set<Long> senderIds = records.stream().map(Message::getSenderId)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, User> senders = senderIds.isEmpty() ? Collections.emptyMap()
                : userMapper.selectBatchIds(senderIds).stream()
                .collect(Collectors.toMap(User::getId, user -> user));
        boolean hasMore = !records.isEmpty() && messageMapper.selectCount(
                new LambdaQueryWrapper<Message>()
                        .eq(Message::getConversationId, conversationId)
                        .lt(Message::getId, records.get(0).getId())) > 0;
        return new MessageBatchVO(records.stream().map(message -> toVO(message, senders)).toList(), hasMore);
    }

    @Override
    public List<ConversationVO> getConversations(Long userId) {
        List<Map<String, Object>> summaries = messageMapper.selectConversationSummaries(userId);
        if (summaries.isEmpty()) {
            return Collections.emptyList();
        }

        List<Long> latestIds = summaries.stream()
                .map(summary -> number(summary, "latestId").longValue())
                .toList();
        Map<Long, Message> latestMessages = messageMapper.selectBatchIds(latestIds).stream()
                .collect(Collectors.toMap(Message::getId, message -> message));
        Set<Long> otherUserIds = latestMessages.values().stream()
                .map(message -> message.getSenderId().equals(userId)
                        ? message.getReceiverId() : message.getSenderId())
                .collect(Collectors.toSet());
        Map<Long, User> users = otherUserIds.isEmpty() ? Collections.emptyMap()
                : userMapper.selectBatchIds(otherUserIds).stream()
                .collect(Collectors.toMap(User::getId, user -> user));

        List<ConversationVO> result = new ArrayList<>(summaries.size());
        for (Map<String, Object> summary : summaries) {
            Message latest = latestMessages.get(number(summary, "latestId").longValue());
            if (latest == null) continue;
            Long otherUserId = latest.getSenderId().equals(userId)
                    ? latest.getReceiverId() : latest.getSenderId();
            User otherUser = users.get(otherUserId);
            result.add(ConversationVO.builder()
                    .conversationId(text(summary, "conversationId"))
                    .otherUserId(otherUserId)
                    .otherUserName(displayName(otherUser))
                    .otherUserAvatar(otherUser != null ? otherUser.getAvatar() : null)
                    .lastMessage(latest.getContent())
                    .lastMessageTime(latest.getCreatedAt())
                    .unreadCount(number(summary, "unreadCount").intValue())
                    .build());
        }
        // A user can have both an old claim conversation and a direct conversation
        // with the same person. Keep one row per person and retain the unread total.
        Map<Long, ConversationVO> uniqueByOtherUser = new LinkedHashMap<>();
        for (ConversationVO conversation : result) {
            ConversationVO previous = uniqueByOtherUser.get(conversation.getOtherUserId());
            if (previous == null) {
                uniqueByOtherUser.put(conversation.getOtherUserId(), conversation);
                continue;
            }
            int unreadTotal = previous.getUnreadCount() + conversation.getUnreadCount();
            ConversationVO latest = isAfter(conversation.getLastMessageTime(), previous.getLastMessageTime())
                    ? conversation : previous;
            latest.setUnreadCount(unreadTotal);
            uniqueByOtherUser.put(conversation.getOtherUserId(), latest);
        }
        return new ArrayList<>(uniqueByOtherUser.values());
    }

    @Override
    public void markRead(Long userId, Long messageId) {
        Message msg = messageMapper.selectById(messageId);
        if (msg == null) {
            throw new BusinessException("消息不存在");
        }
        if (!msg.getReceiverId().equals(userId)) {
            throw new BusinessException("无权操作该消息");
        }
        msg.setIsRead(true);
        messageMapper.updateById(msg);
    }

    @Override
    public void markConversationRead(Long userId, String conversationId) {
        if (!isParticipant(userId, conversationId)) {
            throw new BusinessException("无权访问该对话");
        }
        LambdaUpdateWrapper<Message> uw = new LambdaUpdateWrapper<>();
        uw.eq(Message::getConversationId, conversationId)
                .eq(Message::getReceiverId, userId)
                .eq(Message::getIsRead, false)
                .set(Message::getIsRead, true);
        messageMapper.update(null, uw);

        // Clear message notification state when all messages are read
        Long remainingUnread = messageMapper.selectCount(
                new LambdaQueryWrapper<Message>()
                        .eq(Message::getReceiverId, userId)
                .eq(Message::getIsRead, false));
        if (remainingUnread == null || remainingUnread == 0) {
            UserEmailPreference pref = emailPreferenceMapper.selectById(userId);
            if (pref != null && pref.getLastMessageNotifiedAt() != null) {
                pref.setLastMessageNotifiedAt(null);
                emailPreferenceMapper.updateById(pref);
            }
        }
    }

    @Override
    public void systemMessage(String conversationId, Long senderId, Long receiverId, String content) {
        Message msg = new Message();
        // System messages belong to the same direct thread as normal messages.
        msg.setConversationId(directConversationId(senderId, receiverId));
        msg.setSenderId(senderId);
        msg.setReceiverId(receiverId);
        msg.setContent(content);
        msg.setMessageType(MessageType.NARRATION.getValue());
        msg.setIsRead(false);
        messageMapper.insert(msg);
        sseConnectionService.sendToUser(receiverId, SseConnectionService.MESSAGE_EVENT, toVO(msg));
    }

    @Override
    public String startConversation(Long userId1, Long userId2) {
        if (userId1.equals(userId2)) {
            throw new BusinessException("不能与自己创建对话");
        }
        User target = userMapper.selectById(userId2);
        if (target == null || !UserStatus.ACTIVE.getValue().equals(target.getStatus())) {
            throw new BusinessException("目标用户不存在或不可用");
        }
        long a = Math.min(userId1, userId2);
        long b = Math.max(userId1, userId2);
        return a + "_" + b;
    }

    @Override
    public boolean isParticipant(Long userId, String conversationId) {
        if (conversationId != null) {
            String[] directUsers = conversationId.split("_", -1);
            if (directUsers.length == 2) {
                try {
                    long firstUserId = Long.parseLong(directUsers[0]);
                    long secondUserId = Long.parseLong(directUsers[1]);
                    if (firstUserId != secondUserId
                            && (userId.equals(firstUserId) || userId.equals(secondUserId))) {
                        return true;
                    }
                } catch (NumberFormatException ignored) {
                    // Claim conversations require an existing message participant.
                }
            }
        }
        LambdaQueryWrapper<Message> qw = new LambdaQueryWrapper<>();
        qw.eq(Message::getConversationId, conversationId)
                .and(w -> w.eq(Message::getSenderId, userId).or().eq(Message::getReceiverId, userId));
        return messageMapper.selectCount(qw) > 0;
    }

    private boolean canSendToConversation(Long senderId, Long receiverId, String conversationId) {
        if (directConversationId(senderId, receiverId).equals(conversationId)) {
            return true;
        }
        return isParticipant(senderId, conversationId) && isParticipant(receiverId, conversationId);
    }

    private String directConversationId(Long userId1, Long userId2) {
        long a = Math.min(userId1, userId2);
        long b = Math.max(userId1, userId2);
        return a + "_" + b;
    }

    private boolean isAfter(java.time.LocalDateTime candidate, java.time.LocalDateTime reference) {
        return candidate != null && (reference == null || candidate.isAfter(reference));
    }

    private MessageVO toVO(Message msg) {
        User sender = userMapper.selectById(msg.getSenderId());
        return toVO(msg, sender == null ? Collections.emptyMap() : Map.of(sender.getId(), sender));
    }

    private MessageVO toVO(Message msg, Map<Long, User> senders) {
        User sender = senders.get(msg.getSenderId());
        return MessageVO.builder()
                .id(msg.getId())
                .conversationId(msg.getConversationId())
                .senderId(msg.getSenderId())
                .senderName(sender != null ? displayName(sender) : "系统")
                .receiverId(msg.getReceiverId())
                .content(msg.getContent())
                .messageType(msg.getMessageType() == null
                        ? MessageType.USER.getValue() : msg.getMessageType())
                .isRead(msg.getIsRead())
                .createdAt(msg.getCreatedAt())
                .build();
    }

    private Number number(Map<String, Object> values, String key) {
        Object value = mapValue(values, key);
        if (!(value instanceof Number number)) {
            throw new BusinessException("会话汇总数据格式错误");
        }
        return number;
    }

    private String text(Map<String, Object> values, String key) {
        Object value = mapValue(values, key);
        if (value == null) {
            throw new BusinessException("会话汇总数据格式错误");
        }
        return value.toString();
    }

    private Object mapValue(Map<String, Object> values, String key) {
        Object value = values.get(key);
        if (value != null) return value;
        value = values.get(key.toLowerCase(Locale.ROOT));
        if (value != null) return value;
        return values.get(key.toUpperCase(Locale.ROOT));
    }

    private String displayName(User user) {
        if (user == null) return "未知用户";
        return user.getRealName() != null ? user.getRealName() : user.getUsername();
    }

    private void validateInitialMessageLimit(Long senderId, Long receiverId) {
        if (hasApprovedClaimRelation(senderId, receiverId)) return;
        Long sentCount = messageMapper.selectCount(new LambdaQueryWrapper<Message>()
                .eq(Message::getSenderId, senderId)
                .eq(Message::getReceiverId, receiverId)
                .eq(Message::getMessageType, MessageType.USER.getValue()));
        if (sentCount == null || sentCount == 0) return;
        Long replyCount = messageMapper.selectCount(new LambdaQueryWrapper<Message>()
                .eq(Message::getSenderId, receiverId)
                .eq(Message::getReceiverId, senderId)
                .eq(Message::getMessageType, MessageType.USER.getValue()));
        if (replyCount == null || replyCount == 0) {
            throw new BusinessException("对方回复前只能发送一条消息");
        }
    }

    private boolean hasApprovedClaimRelation(Long firstUserId, Long secondUserId) {
        Long count = claimApplicationMapper.selectCount(new LambdaQueryWrapper<ClaimApplication>()
                .eq(ClaimApplication::getStatus, ClaimStatus.APPROVED.getValue())
                .and(wrapper -> wrapper
                        .nested(pair -> pair
                                .eq(ClaimApplication::getApplicantId, firstUserId)
                                .eq(ClaimApplication::getPublisherId, secondUserId))
                        .or()
                        .nested(pair -> pair
                                .eq(ClaimApplication::getApplicantId, secondUserId)
                                .eq(ClaimApplication::getPublisherId, firstUserId))));
        return count != null && count > 0;
    }

    private Object sendLock(Long firstUserId, Long secondUserId) {
        long lowerUserId = Math.min(firstUserId, secondUserId);
        long higherUserId = Math.max(firstUserId, secondUserId);
        int hash = Long.hashCode(lowerUserId) * 31 + Long.hashCode(higherUserId);
        return sendLocks[(hash & Integer.MAX_VALUE) % sendLocks.length];
    }

    private static Object[] createSendLocks() {
        Object[] locks = new Object[256];
        java.util.Arrays.setAll(locks, ignored -> new Object());
        return locks;
    }
}
