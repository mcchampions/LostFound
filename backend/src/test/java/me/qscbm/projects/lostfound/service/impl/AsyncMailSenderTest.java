package me.qscbm.projects.lostfound.service.impl;

import me.qscbm.projects.lostfound.entity.User;
import me.qscbm.projects.lostfound.mapper.UserMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AsyncMailSenderTest {

    private UserMapper userMapper;
    private JavaMailSender mailSender;
    private AsyncMailSender asyncMailSender;

    @BeforeEach
    void setUp() {
        userMapper = mock(UserMapper.class);
        mailSender = mock(JavaMailSender.class);
        asyncMailSender = new AsyncMailSender(userMapper, mailSender);
    }

    @Test
    void sendsNotificationOnlyToVerifiedOptedInUser() {
        User user = eligibleUser();
        when(userMapper.selectById(1L)).thenReturn(user);

        asyncMailSender.sendUserNotification(1L, "Subject", "Content");

        verify(mailSender).send(argThat((SimpleMailMessage message) ->
                "user@example.com".equals(message.getTo()[0])
                        && "Subject".equals(message.getSubject())
                        && "Content".equals(message.getText())));
    }

    @Test
    void skipsUserWhoDisabledEmailNotifications() {
        User user = eligibleUser();
        user.setNotifyEmail(0);
        when(userMapper.selectById(1L)).thenReturn(user);

        asyncMailSender.sendUserNotification(1L, "Subject", "Content");

        verify(mailSender, never()).send(any(SimpleMailMessage.class));
    }

    @Test
    void announcementIsSentIndividuallyToEligibleUsers() {
        User first = eligibleUser();
        User second = eligibleUser();
        second.setId(2L);
        second.setEmail("second@example.com");
        when(userMapper.selectList(any())).thenReturn(List.of(first, second));

        asyncMailSender.sendAnnouncement("Notice", "Announcement content");

        verify(mailSender, times(2)).send(any(SimpleMailMessage.class));
    }

    private User eligibleUser() {
        User user = new User();
        user.setId(1L);
        user.setEmail("user@example.com");
        user.setStatus("ACTIVE");
        user.setEmailVerified(1);
        user.setNotifyEmail(1);
        return user;
    }
}
