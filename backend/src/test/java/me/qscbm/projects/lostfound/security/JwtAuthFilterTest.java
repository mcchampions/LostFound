package me.qscbm.projects.lostfound.security;

import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import me.qscbm.projects.lostfound.entity.User;
import me.qscbm.projects.lostfound.mapper.UserMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class JwtAuthFilterTest {

    private JwtUtils jwtUtils;
    private UserMapper userMapper;
    private JwtAuthFilter filter;

    @BeforeEach
    void setUp() {
        jwtUtils = mock(JwtUtils.class);
        userMapper = mock(UserMapper.class);
        filter = new JwtAuthFilter(jwtUtils, userMapper);
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void authenticatesActiveUserWithValidToken() throws Exception {
        Claims claims = claims(new Date());
        when(jwtUtils.parse("token")).thenReturn(claims);
        when(jwtUtils.getUserId(any())).thenReturn(1L);
        when(userMapper.selectById(1L)).thenReturn(user(null));

        filter.doFilter(requestWithToken("token"), new MockHttpServletResponse(), mock(FilterChain.class));

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
    }

    @Test
    void rejectsTokenIssuedBeforePasswordChange() throws Exception {
        Date issuedBeforeChange = Date.from(
                LocalDateTime.now().minusMinutes(5).atZone(ZoneId.systemDefault()).toInstant());
        Claims claims = claims(issuedBeforeChange);
        when(jwtUtils.parse("token")).thenReturn(claims);
        when(jwtUtils.getUserId(any())).thenReturn(1L);
        when(userMapper.selectById(1L)).thenReturn(user(LocalDateTime.now()));

        filter.doFilter(requestWithToken("token"), new MockHttpServletResponse(), mock(FilterChain.class));

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    private MockHttpServletRequest requestWithToken(String token) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + token);
        return request;
    }

    private Claims claims(Date issuedAt) {
        Claims claims = mock(Claims.class);
        when(claims.getIssuedAt()).thenReturn(issuedAt);
        return claims;
    }

    private User user(LocalDateTime passwordChangedAt) {
        User user = new User();
        user.setId(1L);
        user.setRole("STUDENT");
        user.setStatus("ACTIVE");
        user.setPasswordChangedAt(passwordChangedAt);
        return user;
    }
}
