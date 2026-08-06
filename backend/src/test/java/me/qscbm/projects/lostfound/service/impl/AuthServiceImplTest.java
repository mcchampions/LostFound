package me.qscbm.projects.lostfound.service.impl;

import me.qscbm.projects.lostfound.common.BusinessException;
import me.qscbm.projects.lostfound.common.CodeHasher;
import me.qscbm.projects.lostfound.dto.LoginRequest;
import me.qscbm.projects.lostfound.dto.RegisterRequest;
import me.qscbm.projects.lostfound.dto.UserVO;
import me.qscbm.projects.lostfound.entity.User;
import me.qscbm.projects.lostfound.entity.PasswordResetCode;
import me.qscbm.projects.lostfound.mapper.PasswordResetCodeMapper;
import me.qscbm.projects.lostfound.mapper.UserMapper;
import me.qscbm.projects.lostfound.security.JwtUtils;
import me.qscbm.projects.lostfound.service.LoginAttemptService;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class AuthServiceImplTest {

    private UserMapper userMapper;
    private PasswordEncoder passwordEncoder;
    private AuthServiceImpl service;
    private PasswordResetCodeMapper passwordResetCodeMapper;
    private JavaMailSender mailSender;
    private LoginAttemptService loginAttemptService;

    @BeforeEach
    void setUp() {
        userMapper = mock(UserMapper.class);
        passwordEncoder = mock(PasswordEncoder.class);
        JwtUtils jwtUtils = mock(JwtUtils.class);
        passwordResetCodeMapper = mock(PasswordResetCodeMapper.class);
        mailSender = mock(JavaMailSender.class);
        OperationLogRecorder operationLogRecorder = mock(OperationLogRecorder.class);
        loginAttemptService = mock(LoginAttemptService.class);
        EmailContentBuilder emailContentBuilder = new EmailContentBuilder("http://localhost:5173");
        service = new AuthServiceImpl(userMapper, passwordEncoder, jwtUtils,
                passwordResetCodeMapper, mailSender, operationLogRecorder,
                loginAttemptService, emailContentBuilder);
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

    @Test
    void lockedUsernameIsRejectedBeforeLookup() {
        when(loginAttemptService.isLocked(eq("student"), any())).thenReturn(true);
        when(loginAttemptService.remainingLockSeconds(eq("student"), any())).thenReturn(900L);

        assertThatThrownBy(() -> service.login(loginRequest("student", "password123")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("登录失败次数过多");
        verify(userMapper, never()).selectOne(any());
    }

    @Test
    void failedLoginRecordsAttempt() {
        when(userMapper.selectOne(any())).thenReturn(null);

        assertThatThrownBy(() -> service.login(loginRequest("student", "wrong")))
                .isInstanceOf(BusinessException.class)
                .hasMessage("用户名或密码错误");
        verify(loginAttemptService).recordFailure(any(), any());
    }

    @Test
    void successfulLoginResetsFailures() {
        User user = activeUser("student@example.com");
        user.setUsername("student");
        user.setPassword("encoded-password");
        user.setRole("STUDENT");
        when(userMapper.selectOne(any())).thenReturn(user);
        when(passwordEncoder.matches("password123", "encoded-password")).thenReturn(true);

        service.login(loginRequest("student", "password123"));

        verify(loginAttemptService).reset("student");
    }

    @Test
    void sendsPasswordResetCodeToActiveUser() {
        when(userMapper.selectOne(any())).thenReturn(activeUser("user@example.com"));
        when(passwordResetCodeMapper.updateIfCooldown(any(), anyLong())).thenReturn(0);
        when(passwordResetCodeMapper.insert(any())).thenReturn(1);

        service.sendPasswordResetCode("user@example.com");

        ArgumentCaptor<SimpleMailMessage> captor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(captor.capture());
        SimpleMailMessage mail = captor.getValue();
        assertThat(mail.getTo()).containsExactly("user@example.com");
        assertThat(mail.getText()).contains("重置密码验证码");
        verify(passwordResetCodeMapper).insert(argThat(record ->
                record.getUserId().equals(1L) && "user@example.com".equals(record.getEmail())));
    }

    @Test
    void skipsSendingResetCodeForUnknownEmail() {
        when(userMapper.selectOne(any())).thenReturn(null);

        service.sendPasswordResetCode("nobody@example.com");

        verify(mailSender, never()).send(any(SimpleMailMessage.class));
        verify(passwordResetCodeMapper, never()).insert(any());
    }

    @Test
    void resetsPasswordWithValidCode() {
        when(userMapper.selectOne(any())).thenReturn(activeUser("user@example.com"));
        PasswordResetCode record = resetRecord(0, System.currentTimeMillis() + 300_000);
        when(passwordResetCodeMapper.selectById(1L)).thenReturn(record);
        when(passwordResetCodeMapper.consumeValidCode(anyLong(), anyString(), anyString(), anyLong(), anyInt()))
                .thenReturn(1);
        when(passwordEncoder.encode("newpass123")).thenReturn("encoded-new");

        service.resetPassword("user@example.com", "123456", "newpass123");

        verify(userMapper).updateById(argThat(user ->
                "encoded-new".equals(user.getPassword())
                        && user.getPasswordChangedAt() != null));
        verify(passwordResetCodeMapper).consumeValidCode(
                eq(1L), eq("user@example.com"), anyString(), anyLong(), eq(5));
    }

    @Test
    void rejectsWrongResetCodeAndCountsAttempts() {
        when(userMapper.selectOne(any())).thenReturn(activeUser("user@example.com"));
        when(passwordResetCodeMapper.selectById(1L)).thenReturn(
                resetRecord(0, System.currentTimeMillis() + 300_000));
        assertThatThrownBy(() -> service.resetPassword("user@example.com", "000000", "newpass123"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("还可尝试");
        verify(passwordResetCodeMapper).incrementAttempts(1L, 5);
        verify(userMapper, never()).updateById(any());
    }

    private User activeUser(String email) {
        User user = new User();
        user.setId(1L);
        user.setUsername("student");
        user.setEmail(email);
        user.setStatus("ACTIVE");
        return user;
    }

    private PasswordResetCode resetRecord(int attempts, long expiresAt) {
        PasswordResetCode record = new PasswordResetCode();
        record.setUserId(1L);
        record.setEmail("user@example.com");
        record.setCodeHash(CodeHasher.hash("123456"));
        record.setSentAt(System.currentTimeMillis());
        record.setExpiresAt(expiresAt);
        record.setAttempts(attempts);
        return record;
    }

    private RegisterRequest registerRequest(String role) {
        RegisterRequest request = new RegisterRequest();
        request.setUsername("student");
        request.setPassword("password123");
        request.setRealName("Student");
        request.setRole(role);
        return request;
    }

    private LoginRequest loginRequest(String username, String password) {
        LoginRequest request = new LoginRequest();
        request.setUsername(username);
        request.setPassword(password);
        return request;
    }
}
