package me.qscbm.projects.lostfound.security;

import io.jsonwebtoken.Claims;
import me.qscbm.projects.lostfound.entity.User;
import me.qscbm.projects.lostfound.mapper.UserMapper;
import me.qscbm.projects.lostfound.service.WebSocketPresenceService;
import me.qscbm.projects.lostfound.service.impl.OfflineMessageEmailTracker;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.util.Collections;

@Component
public class WebSocketAuthChannelInterceptor implements ChannelInterceptor {

    private final JwtUtils jwtUtils;
    private final UserMapper userMapper;
    private final WebSocketPresenceService presenceService;
    private final OfflineMessageEmailTracker offlineEmailTracker;

    public WebSocketAuthChannelInterceptor(JwtUtils jwtUtils, UserMapper userMapper,
                                           WebSocketPresenceService presenceService,
                                           OfflineMessageEmailTracker offlineEmailTracker) {
        this.jwtUtils = jwtUtils;
        this.userMapper = userMapper;
        this.presenceService = presenceService;
        this.offlineEmailTracker = offlineEmailTracker;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            String token = extractBearerToken(accessor.getFirstNativeHeader("Authorization"));
            if (!StringUtils.hasText(token)) {
                throw new AccessDeniedException("WebSocket 未认证");
            }

            try {
                Claims claims = jwtUtils.parse(token);
                Long userId = jwtUtils.getUserId(claims);
                User user = userMapper.selectById(userId);
                if (user == null || !"ACTIVE".equals(user.getStatus())) {
                    throw new AccessDeniedException("WebSocket 用户不可用");
                }

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                userId,
                                null,
                                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + user.getRole()))
                        );
                accessor.setUser(authentication);
                presenceService.onConnect(userId);
                offlineEmailTracker.resetStatus(userId);
            } catch (AccessDeniedException e) {
                throw e;
            } catch (Exception e) {
                throw new AccessDeniedException("WebSocket Token 无效", e);
            }
        }

        if (StompCommand.DISCONNECT.equals(accessor.getCommand())) {
            var principal = accessor.getUser();
            if (principal instanceof UsernamePasswordAuthenticationToken auth) {
                Long userId = (Long) auth.getPrincipal();
                presenceService.onDisconnect(userId);
            }
        }

        if (StompCommand.SEND.equals(accessor.getCommand())) {
            String destination = accessor.getDestination();
            if (destination == null || !destination.startsWith("/app/")) {
                throw new AccessDeniedException("WebSocket 不允许直接向消息代理发送消息");
            }
        }

        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            String destination = accessor.getDestination();
            if (!"/user/queue/messages".equals(destination)) {
                throw new AccessDeniedException("WebSocket 无权订阅该目标");
            }
        }
        return message;
    }

    private String extractBearerToken(String authorization) {
        if (StringUtils.hasText(authorization) && authorization.startsWith("Bearer ")) {
            return authorization.substring(7);
        }
        return null;
    }
}
