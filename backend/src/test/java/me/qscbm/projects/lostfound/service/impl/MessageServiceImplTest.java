package me.qscbm.projects.lostfound.service.impl;

import me.qscbm.projects.lostfound.common.BusinessException;
import me.qscbm.projects.lostfound.dto.MessageRequest;
import me.qscbm.projects.lostfound.dto.MessageVO;
import me.qscbm.projects.lostfound.entity.Message;
import me.qscbm.projects.lostfound.entity.User;
import me.qscbm.projects.lostfound.mapper.MessageMapper;
import me.qscbm.projects.lostfound.mapper.UserMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class MessageServiceImplTest {

    private MessageMapper messageMapper;
    private UserMapper userMapper;
    private SimpMessagingTemplate messagingTemplate;
    private MessageServiceImpl service;

    @BeforeEach
    void setUp() {
        messageMapper = mock(MessageMapper.class);
        userMapper = mock(UserMapper.class);
        messagingTemplate = mock(SimpMessagingTemplate.class);
        service = new MessageServiceImpl(messageMapper, userMapper, messagingTemplate);
    }

    @Test
    void allowsFirstMessageInDeterministicDirectConversation() {
        User receiver = user(2L, "Receiver");
        User sender = user(1L, "Sender");
        when(userMapper.selectById(2L)).thenReturn(receiver);
        when(userMapper.selectById(1L)).thenReturn(sender);
        doAnswer(invocation -> {
            Message message = invocation.getArgument(0);
            message.setId(10L);
            message.setCreatedAt(LocalDateTime.now());
            return 1;
        }).when(messageMapper).insert(any(Message.class));

        MessageRequest request = request("1_2", 2L, " hello ");
        MessageVO result = service.send(1L, request);

        assertThat(result.getConversationId()).isEqualTo("1_2");
        assertThat(result.getContent()).isEqualTo("hello");
        verify(messagingTemplate).convertAndSendToUser("2", "/queue/messages", result);
    }

    @Test
    void rejectsArbitraryConversationId() {
        when(userMapper.selectById(2L)).thenReturn(user(2L, "Receiver"));
        when(messageMapper.selectCount(any())).thenReturn(0L);

        assertThatThrownBy(() -> service.send(1L, request("forged", 2L, "hello")))
                .isInstanceOf(BusinessException.class)
                .hasMessage("无权向该对话发送消息");
        verify(messageMapper, never()).insert(any());
    }

    @Test
    void allowsExistingClaimConversationForBothParticipants() {
        when(userMapper.selectById(2L)).thenReturn(user(2L, "Receiver"));
        when(userMapper.selectById(1L)).thenReturn(user(1L, "Sender"));
        when(messageMapper.selectCount(any())).thenReturn(1L);
        doAnswer(invocation -> {
            Message message = invocation.getArgument(0);
            message.setId(11L);
            message.setCreatedAt(LocalDateTime.now());
            return 1;
        }).when(messageMapper).insert(any(Message.class));

        MessageVO result = service.send(1L, request("claim_9", 2L, "hello"));

        assertThat(result.getConversationId()).isEqualTo("claim_9");
        verify(messageMapper, times(2)).selectCount(any());
    }

    private MessageRequest request(String conversationId, Long receiverId, String content) {
        MessageRequest request = new MessageRequest();
        request.setConversationId(conversationId);
        request.setReceiverId(receiverId);
        request.setContent(content);
        return request;
    }

    private User user(Long id, String realName) {
        User user = new User();
        user.setId(id);
        user.setRealName(realName);
        user.setStatus("ACTIVE");
        return user;
    }
}
