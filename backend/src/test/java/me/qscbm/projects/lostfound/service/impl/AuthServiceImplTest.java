package me.qscbm.projects.lostfound.service.impl;

import me.qscbm.projects.lostfound.common.BusinessException;
import me.qscbm.projects.lostfound.dto.LoginRequest;
import me.qscbm.projects.lostfound.dto.RegisterRequest;
import me.qscbm.projects.lostfound.dto.UserVO;
import me.qscbm.projects.lostfound.entity.User;
import me.qscbm.projects.lostfound.mapper.UserMapper;
import me.qscbm.projects.lostfound.security.JwtUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AuthServiceImplTest {

    private UserMapper userMapper;
    private PasswordEncoder passwordEncoder;
    private AuthServiceImpl service;

    @BeforeEach
    void setUp() {
        userMapper = mock(UserMapper.class);
        passwordEncoder = mock(PasswordEncoder.class);
        JwtUtils jwtUtils = mock(JwtUtils.class);
        service = new AuthServiceImpl(userMapper, passwordEncoder, jwtUtils);
        when(passwordEncoder.encode(any())).thenReturn("encoded-password");
    }

    @Test
    void studentRegistrationCreatesActiveUser() {
        when(userMapper.exists(any())).thenReturn(false);
        RegisterRequest request = registerRequest("STUDENT");

        UserVO result = service.register(request);

        assertThat(result.getRole()).isEqualTo("STUDENT");
        assertThat(result.getStatus()).isEqualTo("ACTIVE");
        verify(userMapper).insert(argThat(user ->
                "encoded-password".equals(user.getPassword())
                        && "ACTIVE".equals(user.getStatus())));
    }

    @Test
    void teacherRegistrationRequiresApproval() {
        when(userMapper.exists(any())).thenReturn(false);

        UserVO result = service.register(registerRequest("TEACHER"));

        assertThat(result.getRole()).isEqualTo("TEACHER");
        assertThat(result.getStatus()).isEqualTo("PENDING");
    }

    @Test
    void serviceRejectsSelfRegistrationAsAdmin() {
        when(userMapper.exists(any())).thenReturn(false);

        assertThatThrownBy(() -> service.register(registerRequest("ADMIN")))
                .isInstanceOf(BusinessException.class)
                .hasMessage("不允许自行注册管理员账号");
        verify(userMapper, never()).insert(any());
    }

    @Test
    void inactiveUserCannotLogin() {
        User user = new User();
        user.setId(1L);
        user.setUsername("student");
        user.setPassword("encoded-password");
        user.setRole("STUDENT");
        user.setStatus("INACTIVE");
        when(userMapper.selectOne(any())).thenReturn(user);
        when(passwordEncoder.matches("password123", "encoded-password")).thenReturn(true);

        LoginRequest request = new LoginRequest();
        request.setUsername("student");
        request.setPassword("password123");

        assertThatThrownBy(() -> service.login(request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("账号已被禁用");
    }

    private RegisterRequest registerRequest(String role) {
        RegisterRequest request = new RegisterRequest();
        request.setUsername("student");
        request.setPassword("password123");
        request.setRealName("Student");
        request.setRole(role);
        return request;
    }
}
