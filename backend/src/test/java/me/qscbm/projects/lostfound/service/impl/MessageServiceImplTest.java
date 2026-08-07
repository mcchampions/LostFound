package me.qscbm.projects.lostfound.service.impl;

import me.qscbm.projects.lostfound.common.BusinessException;
import me.qscbm.projects.lostfound.dto.MessageRequest;
import me.qscbm.projects.lostfound.dto.MessageVO;
import me.qscbm.projects.lostfound.entity.Message;
import me.qscbm.projects.lostfound.entity.User;
import me.qscbm.projects.lostfound.mapper.MessageMapper;
import me.qscbm.projects.lostfound.mapper.UserEmailPreferenceMapper;
import me.qscbm.projects.lostfound.mapper.UserMapper;
import me.qscbm.projects.lostfound.service.SseConnectionService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class MessageServiceImplTest {

    private MessageMapper messageMapper;
    private UserMapper userMapper;
    private UserEmailPreferenceMapper emailPreferenceMapper;
    private SseConnectionService sseConnectionService;
    private OfflineMessageEmailTracker offlineEmailTracker;
    private MessageServiceImpl service;

    @BeforeEach
    void setUp() {
        messageMapper = mock(MessageMapper.class);
        userMapper = mock(UserMapper.class);
        emailPreferenceMapper = mock(UserEmailPreferenceMapper.class);
        sseConnectionService = mock(SseConnectionService.class);
        offlineEmailTracker = mock(OfflineMessageEmailTracker.class);
        service = new MessageServiceImpl(
                messageMapper, userMapper, emailPreferenceMapper, sseConnectionService,
                offlineEmailTracker);
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
        verify(sseConnectionService).sendToUser(2L, SseConnectionService.MESSAGE_EVENT, result);
    }

    @Test
    void collectsOfflineConversationForEmailDigest() {
        User receiver = user(2L, "Receiver");
        when(userMapper.selectById(2L)).thenReturn(receiver);
        when(userMapper.selectById(1L)).thenReturn(user(1L, "Sender"));
        when(sseConnectionService.isOnline(2L)).thenReturn(false);
        doAnswer(invocation -> {
            Message message = invocation.getArgument(0);
            message.setId(20L);
            message.setCreatedAt(LocalDateTime.now());
            return 1;
        }).when(messageMapper).insert(any(Message.class));

        service.send(1L, request("1_2", 2L, "hello"));

        verify(offlineEmailTracker).collectIfEligible(receiver, "1_2");
    }

    @Test
    void skipsEmailDigestCollectionWhenReceiverIsOnline() {
        User receiver = user(2L, "Receiver");
        when(userMapper.selectById(2L)).thenReturn(receiver);
        when(userMapper.selectById(1L)).thenReturn(user(1L, "Sender"));
        when(sseConnectionService.isOnline(2L)).thenReturn(true);
        doAnswer(invocation -> {
            Message message = invocation.getArgument(0);
            message.setId(21L);
            message.setCreatedAt(LocalDateTime.now());
            return 1;
        }).when(messageMapper).insert(any(Message.class));

        service.send(1L, request("1_2", 2L, "hello"));

        verify(offlineEmailTracker, never()).collectIfEligible(any(), any());
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

    @Test
    void systemMessageUsesTheStableDirectConversationId() {
        doAnswer(invocation -> {
            Message message = invocation.getArgument(0);
            message.setId(12L);
            message.setCreatedAt(LocalDateTime.now());
            return 1;
        }).when(messageMapper).insert(any(Message.class));

        service.systemMessage("claim_9", 2L, 1L, "approved");

        verify(messageMapper).insert(argThat(message -> "1_2".equals(message.getConversationId())));
        verify(sseConnectionService).sendToUser(
                eq(1L), eq(SseConnectionService.MESSAGE_EVENT), any(MessageVO.class));
    }

    @Test
    void conversationListMergesMultipleThreadsWithTheSamePerson() {
        LocalDateTime older = LocalDateTime.of(2026, 7, 29, 10, 0);
        LocalDateTime newer = older.plusMinutes(5);
        when(messageMapper.selectConversationSummaries(anyLong())).thenReturn(List.of(
                Map.of("conversationId", "claim_9", "latestId", 9L, "unreadCount", 1L),
                Map.of("conversationId", "1_2", "latestId", 10L, "unreadCount", 2L)));
        Message oldMessage = message(9L, "claim_9", 2L, 1L, older);
        Message newMessage = message(10L, "1_2", 1L, 2L, newer);
        when(messageMapper.selectBatchIds(any())).thenReturn(List.of(oldMessage, newMessage));
        when(userMapper.selectBatchIds(any())).thenReturn(List.of(user(2L, "Receiver")));

        var conversations = service.getConversations(1L);

        assertThat(conversations).hasSize(1);
        assertThat(conversations.get(0).getConversationId()).isEqualTo("1_2");
        assertThat(conversations.get(0).getUnreadCount()).isEqualTo(3);
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

    private Message message(Long id, String conversationId, Long senderId, Long receiverId, LocalDateTime createdAt) {
        Message message = new Message();
        message.setId(id);
        message.setConversationId(conversationId);
        message.setSenderId(senderId);
        message.setReceiverId(receiverId);
        message.setContent("message");
        message.setIsRead(false);
        message.setCreatedAt(createdAt);
        return message;
    }
}
