package me.qscbm.projects.lostfound.security;

import io.jsonwebtoken.Claims;
import me.qscbm.projects.lostfound.entity.User;
import me.qscbm.projects.lostfound.mapper.UserMapper;
import me.qscbm.projects.lostfound.service.impl.OfflineMessageEmailTracker;
import me.qscbm.projects.lostfound.service.WebSocketPresenceService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

class WebSocketAuthChannelInterceptorTest {

    private JwtUtils jwtUtils;
    private UserMapper userMapper;
    private WebSocketPresenceService presenceService;
    private OfflineMessageEmailTracker offlineEmailTracker;
    private WebSocketAuthChannelInterceptor interceptor;

    @BeforeEach
    void setUp() {
        jwtUtils = mock(JwtUtils.class);
        userMapper = mock(UserMapper.class);
        presenceService = mock(WebSocketPresenceService.class);
        offlineEmailTracker = mock(OfflineMessageEmailTracker.class);
        interceptor = new WebSocketAuthChannelInterceptor(
                jwtUtils, userMapper, presenceService, offlineEmailTracker);
    }

    @Test
    void bindsAuthenticatedUserToConnectFrame() {
        Claims claims = mock(Claims.class);
        when(jwtUtils.parse("valid-token")).thenReturn(claims);
        when(jwtUtils.getUserId(claims)).thenReturn(7L);
        when(jwtUtils.getRole(claims)).thenReturn("STUDENT");
        User user = new User();
        user.setId(7L);
        user.setStatus("ACTIVE");
        user.setRole("TEACHER");
        when(userMapper.selectById(7L)).thenReturn(user);
        Message<byte[]> message = connectMessage("Bearer valid-token");

        Message<?> result = interceptor.preSend(message, mock(org.springframework.messaging.MessageChannel.class));

        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(result, StompHeaderAccessor.class);
        assertThat(accessor).isNotNull();
        assertThat(accessor.getUser()).isInstanceOf(Authentication.class);
        assertThat(accessor.getUser().getName()).isEqualTo("7");
        assertThat(((Authentication) accessor.getUser()).getAuthorities())
                .extracting("authority")
                .containsExactly("ROLE_TEACHER");
        verify(presenceService).onConnect(7L);
        verify(offlineEmailTracker).resetStatus(7L);
    }

    @Test
    void rejectsConnectWithoutToken() {
        Message<byte[]> message = connectMessage(null);

        assertThatThrownBy(() ->
                interceptor.preSend(message, mock(org.springframework.messaging.MessageChannel.class)))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessage("WebSocket 未认证");
    }

    @Test
    void rejectsInactiveUser() {
        Claims claims = mock(Claims.class);
        when(jwtUtils.parse("valid-token")).thenReturn(claims);
        when(jwtUtils.getUserId(claims)).thenReturn(7L);
        when(jwtUtils.getRole(claims)).thenReturn("STUDENT");
        User user = new User();
        user.setId(7L);
        user.setStatus("INACTIVE");
        when(userMapper.selectById(7L)).thenReturn(user);
        Message<byte[]> message = connectMessage("Bearer valid-token");

        assertThatThrownBy(() ->
                interceptor.preSend(message, mock(org.springframework.messaging.MessageChannel.class)))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessage("WebSocket 用户不可用");
    }

    @Test
    void rejectsTokenIssuedBeforePasswordChange() {
        Claims claims = mock(Claims.class);
        when(jwtUtils.parse("valid-token")).thenReturn(claims);
        when(jwtUtils.getUserId(claims)).thenReturn(7L);
        when(claims.getIssuedAt()).thenReturn(Date.from(
                LocalDateTime.now().minusMinutes(5).atZone(ZoneId.systemDefault()).toInstant()));
        User user = new User();
        user.setId(7L);
        user.setStatus("ACTIVE");
        user.setRole("TEACHER");
        user.setPasswordChangedAt(LocalDateTime.now());
        when(userMapper.selectById(7L)).thenReturn(user);

        assertThatThrownBy(() ->
                interceptor.preSend(connectMessage("Bearer valid-token"),
                        mock(org.springframework.messaging.MessageChannel.class)))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("已失效");
        verify(presenceService, never()).onConnect(7L);
    }

    @Test
    void rejectsDirectSendToBrokerDestination() {
        Message<byte[]> message = frame(StompCommand.SEND, "/topic/messages");

        assertThatThrownBy(() ->
                interceptor.preSend(message, mock(org.springframework.messaging.MessageChannel.class)))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("不允许直接");
    }

    @Test
    void onlyAllowsPrivateMessageSubscription() {
        Message<byte[]> allowed = frame(StompCommand.SUBSCRIBE, "/user/queue/messages");
        assertThat(interceptor.preSend(
                allowed, mock(org.springframework.messaging.MessageChannel.class))).isSameAs(allowed);

        Message<byte[]> allowedNotification = frame(StompCommand.SUBSCRIBE, "/user/queue/notifications");
        assertThat(interceptor.preSend(
                allowedNotification, mock(org.springframework.messaging.MessageChannel.class)))
                .isSameAs(allowedNotification);

        Message<byte[]> rejected = frame(StompCommand.SUBSCRIBE, "/topic/messages");
        assertThatThrownBy(() ->
                interceptor.preSend(rejected, mock(org.springframework.messaging.MessageChannel.class)))
                .isInstanceOf(AccessDeniedException.class)
                .hasMessageContaining("无权订阅");
    }

    private Message<byte[]> connectMessage(String authorization) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        if (authorization != null) {
            accessor.setNativeHeader("Authorization", authorization);
        }
        accessor.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    private Message<byte[]> frame(StompCommand command, String destination) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(command);
        accessor.setDestination(destination);
        accessor.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }
}
