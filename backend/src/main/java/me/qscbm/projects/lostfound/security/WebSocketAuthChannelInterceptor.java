package me.qscbm.projects.lostfound.security;

import io.jsonwebtoken.Claims;
import me.qscbm.projects.lostfound.entity.User;
import me.qscbm.projects.lostfound.mapper.UserMapper;
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

    public WebSocketAuthChannelInterceptor(JwtUtils jwtUtils, UserMapper userMapper) {
        this.jwtUtils = jwtUtils;
        this.userMapper = userMapper;
    }

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor =
                MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String token = extractBearerToken(accessor.getFirstNativeHeader("Authorization"));
            if (!StringUtils.hasText(token)) {
                throw new AccessDeniedException("WebSocket 未认证");
            }

            try {
                Claims claims = jwtUtils.parse(token);
                Long userId = jwtUtils.getUserId(claims);
                String role = jwtUtils.getRole(claims);
                User user = userMapper.selectById(userId);
                if (user == null || !"ACTIVE".equals(user.getStatus())) {
                    throw new AccessDeniedException("WebSocket 用户不可用");
                }

                UsernamePasswordAuthenticationToken authentication =
                        new UsernamePasswordAuthenticationToken(
                                userId,
                                null,
                                Collections.singletonList(new SimpleGrantedAuthority("ROLE_" + role))
                        );
                accessor.setUser(authentication);
            } catch (AccessDeniedException e) {
                throw e;
            } catch (Exception e) {
                throw new AccessDeniedException("WebSocket Token 无效", e);
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
