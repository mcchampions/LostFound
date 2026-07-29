package me.qscbm.projects.lostfound.service.impl;

import me.qscbm.projects.lostfound.common.BusinessException;
import me.qscbm.projects.lostfound.dto.UpdateProfileRequest;
import me.qscbm.projects.lostfound.entity.EmailVerificationCode;
import me.qscbm.projects.lostfound.entity.User;
import me.qscbm.projects.lostfound.mapper.EmailVerificationCodeMapper;
import me.qscbm.projects.lostfound.mapper.UserMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class UserServiceImplTest {

    private UserMapper userMapper;
    private PasswordEncoder passwordEncoder;
    private JavaMailSender mailSender;
    private EmailVerificationCodeMapper verificationCodeMapper;
    private AtomicLong now;
    private UserServiceImpl service;

    @BeforeEach
    void setUp() {
        userMapper = mock(UserMapper.class);
        passwordEncoder = mock(PasswordEncoder.class);
        mailSender = mock(JavaMailSender.class);
        verificationCodeMapper = mock(EmailVerificationCodeMapper.class);
        now = new AtomicLong(1_000_000L);
        service = new UserServiceImpl(
                userMapper, passwordEncoder, mailSender, verificationCodeMapper, now::get);
        when(passwordEncoder.encode(anyString()))
                .thenAnswer(invocation -> "hash:" + invocation.getArgument(0));
        when(passwordEncoder.matches(anyString(), anyString()))
                .thenAnswer(invocation ->
                        ("hash:" + invocation.getArgument(0)).equals(invocation.getArgument(1)));
    }

    @Test
    void changingEmailResetsVerificationAndEmailNotifications() {
        User user = activeUser();
        user.setEmail("old@example.com");
        user.setEmailVerified(1);
        user.setNotifyEmail(1);
        when(userMapper.selectById(1L)).thenReturn(user);

        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setEmail("new@example.com");

        service.updateProfile(1L, request);

        assertThat(user.getEmail()).isEqualTo("new@example.com");
        assertThat(user.getEmailVerified()).isZero();
        assertThat(user.getNotifyEmail()).isZero();
        verify(userMapper).updateById(user);
        verify(verificationCodeMapper).deleteById(1L);
    }

    @Test
    void verificationCodeIsRateLimitedAndCanBeVerified() {
        User user = activeUser();
        user.setEmail("user@example.com");
        when(userMapper.selectById(1L)).thenReturn(user);
        when(verificationCodeMapper.updateIfCooldown(any(), anyLong())).thenReturn(0);
        when(verificationCodeMapper.insert(any()))
                .thenReturn(1)
                .thenThrow(new DuplicateKeyException("duplicate"));

        service.sendVerifyCode(1L);

        ArgumentCaptor<SimpleMailMessage> messageCaptor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(messageCaptor.capture());
        String code = messageCaptor.getValue().getText().replaceAll("\\D", "").substring(0, 6);
        ArgumentCaptor<EmailVerificationCode> codeCaptor =
                ArgumentCaptor.forClass(EmailVerificationCode.class);
        verify(verificationCodeMapper).insert(codeCaptor.capture());
        when(verificationCodeMapper.selectById(1L)).thenReturn(codeCaptor.getValue());

        assertThatThrownBy(() -> service.sendVerifyCode(1L))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("发送过于频繁");

        service.verifyEmail(1L, code);

        assertThat(user.getEmailVerified()).isEqualTo(1);
        verify(userMapper).updateById(user);
    }

    @Test
    void verificationCodeExpiresAfterFiveMinutes() {
        User user = activeUser();
        user.setEmail("user@example.com");
        when(userMapper.selectById(1L)).thenReturn(user);
        when(verificationCodeMapper.updateIfCooldown(any(), anyLong())).thenReturn(0);
        when(verificationCodeMapper.insert(any())).thenReturn(1);

        service.sendVerifyCode(1L);
        ArgumentCaptor<SimpleMailMessage> messageCaptor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(messageCaptor.capture());
        ArgumentCaptor<EmailVerificationCode> codeCaptor =
                ArgumentCaptor.forClass(EmailVerificationCode.class);
        verify(verificationCodeMapper).insert(codeCaptor.capture());
        when(verificationCodeMapper.selectById(1L)).thenReturn(codeCaptor.getValue());
        now.addAndGet(5 * 60 * 1000L + 1);

        assertThatThrownBy(() -> service.verifyEmail(1L, "000000"))
                .isInstanceOf(BusinessException.class)
                .hasMessage("验证码错误或已过期");
        verify(userMapper, never()).updateById(any());
    }

    @Test
    void newCodeCanBeSentAfterCooldown() {
        User user = activeUser();
        user.setEmail("user@example.com");
        when(userMapper.selectById(1L)).thenReturn(user);
        when(verificationCodeMapper.updateIfCooldown(any(), anyLong())).thenReturn(0, 1);
        when(verificationCodeMapper.insert(any())).thenReturn(1);

        service.sendVerifyCode(1L);
        now.addAndGet(60 * 1000L);
        service.sendVerifyCode(1L);

        verify(mailSender, times(2)).send(any(SimpleMailMessage.class));
    }

    @Test
    void verificationCodeIsInvalidatedAfterFiveWrongAttempts() {
        User user = activeUser();
        user.setEmail("user@example.com");
        EmailVerificationCode stored = verificationCode("123456");
        when(userMapper.selectById(1L)).thenReturn(user);
        when(verificationCodeMapper.selectById(1L)).thenReturn(stored);
        when(verificationCodeMapper.incrementAttempts(1L, 5)).thenAnswer(invocation -> {
            stored.setAttempts(stored.getAttempts() + 1);
            return 1;
        });

        for (int attempt = 0; attempt < 4; attempt++) {
            assertThatThrownBy(() -> service.verifyEmail(1L, "000000"))
                    .isInstanceOf(BusinessException.class)
                    .hasMessageContaining("还可尝试");
        }
        assertThatThrownBy(() -> service.verifyEmail(1L, "000000"))
                .isInstanceOf(BusinessException.class)
                .hasMessage("验证码错误次数过多，请重新发送");

        verify(verificationCodeMapper, times(5)).incrementAttempts(1L, 5);
        verify(verificationCodeMapper).deleteById(1L);
        verify(userMapper, never()).updateById(any());
    }

    @Test
    void failedMailSendRemovesStoredCode() {
        User user = activeUser();
        user.setEmail("user@example.com");
        when(userMapper.selectById(1L)).thenReturn(user);
        when(verificationCodeMapper.updateIfCooldown(any(), anyLong())).thenReturn(0);
        when(verificationCodeMapper.insert(any())).thenReturn(1);
        doThrow(new RuntimeException("smtp unavailable")).when(mailSender).send(any(SimpleMailMessage.class));

        assertThatThrownBy(() -> service.sendVerifyCode(1L))
                .isInstanceOf(BusinessException.class)
                .hasMessage("验证码发送失败，请检查邮箱配置");

        verify(verificationCodeMapper).deleteMatching(eq(1L), startsWith("hash:"));
    }

    @Test
    void duplicateEmailCannotBeAssignedToAnotherAccount() {
        User user = activeUser();
        user.setEmail("old@example.com");
        when(userMapper.selectById(1L)).thenReturn(user);
        when(userMapper.exists(any())).thenReturn(true);
        UpdateProfileRequest request = new UpdateProfileRequest();
        request.setEmail("USED@EXAMPLE.COM");

        assertThatThrownBy(() -> service.updateProfile(1L, request))
                .isInstanceOf(BusinessException.class)
                .hasMessage("该邮箱已被其他账号使用");
        verify(userMapper, never()).updateById(any());
    }

    private EmailVerificationCode verificationCode(String code) {
        EmailVerificationCode stored = new EmailVerificationCode();
        stored.setUserId(1L);
        stored.setEmail("user@example.com");
        stored.setCodeHash("hash:" + code);
        stored.setSentAt(now.get());
        stored.setExpiresAt(now.get() + 5 * 60 * 1000L);
        stored.setAttempts(0);
        return stored;
    }

    private User activeUser() {
        User user = new User();
        user.setId(1L);
        user.setUsername("student");
        user.setStatus("ACTIVE");
        return user;
    }
}
