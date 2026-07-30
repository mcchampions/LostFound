package me.qscbm.projects.lostfound.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import me.qscbm.projects.lostfound.common.BusinessException;
import me.qscbm.projects.lostfound.dto.ConversationVO;
import me.qscbm.projects.lostfound.dto.MessageRequest;
import me.qscbm.projects.lostfound.dto.MessageVO;
import me.qscbm.projects.lostfound.entity.Message;
import me.qscbm.projects.lostfound.entity.User;
import me.qscbm.projects.lostfound.entity.UserEmailPreference;
import me.qscbm.projects.lostfound.mapper.MessageMapper;
import me.qscbm.projects.lostfound.mapper.UserEmailPreferenceMapper;
import me.qscbm.projects.lostfound.mapper.UserMapper;
import me.qscbm.projects.lostfound.service.MessageService;
import org.springframework.messaging.simp.SimpMessagingTemplate;
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
    private final UserMapper userMapper;
    private final UserEmailPreferenceMapper emailPreferenceMapper;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public MessageVO send(Long senderId, MessageRequest req) {
        User receiver = userMapper.selectById(req.getReceiverId());
        if (receiver == null || !"ACTIVE".equals(receiver.getStatus())) {
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
        msg.setIsRead(0);
        messageMapper.insert(msg);

        MessageVO vo = toVO(msg);
        messagingTemplate.convertAndSendToUser(
                req.getReceiverId().toString(), "/queue/messages", vo);
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
    public List<ConversationVO> getConversations(Long userId) {
        QueryWrapper<Message> summaryQuery = new QueryWrapper<>();
        summaryQuery.select(
                        "conversation_id AS conversationId",
                        "MAX(id) AS latestId",
                        "SUM(CASE WHEN receiver_id = " + userId
                                + " AND is_read = 0 THEN 1 ELSE 0 END) AS unreadCount")
                .and(w -> w.eq("sender_id", userId).or().eq("receiver_id", userId))
                .groupBy("conversation_id")
                .orderByDesc("latestId");
        List<Map<String, Object>> summaries = messageMapper.selectMaps(summaryQuery);
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
        msg.setIsRead(1);
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
                .eq(Message::getIsRead, 0)
                .set(Message::getIsRead, 1);
        messageMapper.update(null, uw);

        // Clear message notification state when all messages are read
        Long remainingUnread = messageMapper.selectCount(
                new LambdaQueryWrapper<Message>()
                        .eq(Message::getReceiverId, userId)
                        .eq(Message::getIsRead, 0));
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
        msg.setIsRead(0);
        messageMapper.insert(msg);
        messagingTemplate.convertAndSendToUser(
                receiverId.toString(), "/queue/messages", toVO(msg));
    }

    @Override
    public String startConversation(Long userId1, Long userId2) {
        if (userId1.equals(userId2)) {
            throw new BusinessException("不能与自己创建对话");
        }
        User target = userMapper.selectById(userId2);
        if (target == null || !"ACTIVE".equals(target.getStatus())) {
            throw new BusinessException("目标用户不存在或不可用");
        }
        long a = Math.min(userId1, userId2);
        long b = Math.max(userId1, userId2);
        return a + "_" + b;
    }

    @Override
    public boolean isParticipant(Long userId, String conversationId) {
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
}
