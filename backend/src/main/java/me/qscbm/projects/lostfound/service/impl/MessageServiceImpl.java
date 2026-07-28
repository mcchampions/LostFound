package me.qscbm.projects.lostfound.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import me.qscbm.projects.lostfound.common.BusinessException;
import me.qscbm.projects.lostfound.dto.ConversationVO;
import me.qscbm.projects.lostfound.dto.MessageRequest;
import me.qscbm.projects.lostfound.dto.MessageVO;
import me.qscbm.projects.lostfound.entity.Message;
import me.qscbm.projects.lostfound.entity.User;
import me.qscbm.projects.lostfound.mapper.MessageMapper;
import me.qscbm.projects.lostfound.mapper.UserMapper;
import me.qscbm.projects.lostfound.service.MessageService;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MessageServiceImpl implements MessageService {

    private final MessageMapper messageMapper;
    private final UserMapper userMapper;
    private final SimpMessagingTemplate messagingTemplate;

    @Override
    public MessageVO send(Long senderId, MessageRequest req) {
        User receiver = userMapper.selectById(req.getReceiverId());
        if (receiver == null) {
            throw new BusinessException("接收用户不存在");
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
                .orderByAsc(Message::getCreatedAt);
        return messageMapper.selectPage(new Page<>(page, size), qw).convert(this::toVO);
    }

    @Override
    public List<ConversationVO> getConversations(Long userId) {
        LambdaQueryWrapper<Message> qw = new LambdaQueryWrapper<>();
        qw.eq(Message::getSenderId, userId).or()
                .eq(Message::getReceiverId, userId)
                .orderByDesc(Message::getCreatedAt);
        List<Message> messages = messageMapper.selectList(qw);

        Map<String, List<Message>> grouped = messages.stream()
                .collect(Collectors.groupingBy(Message::getConversationId,
                        LinkedHashMap::new, Collectors.toList()));

        List<ConversationVO> result = new ArrayList<>();
        for (Map.Entry<String, List<Message>> entry : grouped.entrySet()) {
            List<Message> convMessages = entry.getValue();
            Message latest = convMessages.get(0);

            Long otherUserId = latest.getSenderId().equals(userId)
                    ? latest.getReceiverId() : latest.getSenderId();
            User otherUser = userMapper.selectById(otherUserId);

            long unread = convMessages.stream()
                    .filter(m -> m.getReceiverId().equals(userId) && m.getIsRead() == 0)
                    .count();

            result.add(ConversationVO.builder()
                    .conversationId(entry.getKey())
                    .otherUserId(otherUserId)
                    .otherUserName(otherUser != null ? otherUser.getRealName() : "未知")
                    .otherUserAvatar(otherUser != null ? otherUser.getAvatar() : null)
                    .lastMessage(latest.getContent())
                    .lastMessageTime(latest.getCreatedAt())
                    .unreadCount((int) unread)
                    .build());
        }
        return result;
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
    public void systemMessage(String conversationId, Long senderId, Long receiverId, String content) {
        Message msg = new Message();
        msg.setConversationId(conversationId);
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
        if (startConversation(senderId, receiverId).equals(conversationId)) {
            return true;
        }
        return isParticipant(senderId, conversationId) && isParticipant(receiverId, conversationId);
    }

    private MessageVO toVO(Message msg) {
        User sender = userMapper.selectById(msg.getSenderId());
        return MessageVO.builder()
                .id(msg.getId())
                .conversationId(msg.getConversationId())
                .senderId(msg.getSenderId())
                .senderName(sender != null ? sender.getRealName() : "系统")
                .receiverId(msg.getReceiverId())
                .content(msg.getContent())
                .isRead(msg.getIsRead())
                .createdAt(msg.getCreatedAt())
                .build();
    }
}
