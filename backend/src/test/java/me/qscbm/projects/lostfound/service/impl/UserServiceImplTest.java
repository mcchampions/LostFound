package me.qscbm.projects.lostfound.service.impl;

import me.qscbm.projects.lostfound.common.BusinessException;
import me.qscbm.projects.lostfound.dto.UpdateProfileRequest;
import me.qscbm.projects.lostfound.entity.User;
import me.qscbm.projects.lostfound.mapper.UserMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class UserServiceImplTest {

    private UserMapper userMapper;
    private JavaMailSender mailSender;
    private AtomicLong now;
    private UserServiceImpl service;

    @BeforeEach
    void setUp() {
        userMapper = mock(UserMapper.class);
        PasswordEncoder passwordEncoder = mock(PasswordEncoder.class);
        mailSender = mock(JavaMailSender.class);
        now = new AtomicLong(1_000_000L);
        service = new UserServiceImpl(userMapper, passwordEncoder, mailSender, now::get);
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
    }

    @Test
    void verificationCodeIsRateLimitedAndCanBeVerified() {
        User user = activeUser();
        user.setEmail("user@example.com");
        when(userMapper.selectById(1L)).thenReturn(user);

        service.sendVerifyCode(1L);

        ArgumentCaptor<SimpleMailMessage> messageCaptor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(messageCaptor.capture());
        String code = messageCaptor.getValue().getText().replaceAll("\\D", "").substring(0, 6);

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

        service.sendVerifyCode(1L);
        ArgumentCaptor<SimpleMailMessage> messageCaptor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender).send(messageCaptor.capture());
        String code = messageCaptor.getValue().getText().replaceAll("\\D", "").substring(0, 6);
        now.addAndGet(5 * 60 * 1000L + 1);

        assertThatThrownBy(() -> service.verifyEmail(1L, code))
                .isInstanceOf(BusinessException.class)
                .hasMessage("验证码错误或已过期");
        verify(userMapper, never()).updateById(any());
    }

    @Test
    void newCodeCanBeSentAfterCooldown() {
        User user = activeUser();
        user.setEmail("user@example.com");
        when(userMapper.selectById(1L)).thenReturn(user);

        service.sendVerifyCode(1L);
        now.addAndGet(60 * 1000L);
        service.sendVerifyCode(1L);

        verify(mailSender, times(2)).send(any(SimpleMailMessage.class));
    }

    private User activeUser() {
        User user = new User();
        user.setId(1L);
        user.setUsername("student");
        user.setStatus("ACTIVE");
        return user;
    }
}
