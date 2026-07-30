package me.qscbm.projects.lostfound.service.impl;

import me.qscbm.projects.lostfound.entity.User;
import me.qscbm.projects.lostfound.entity.UserEmailPreference;
import me.qscbm.projects.lostfound.mapper.UserEmailPreferenceMapper;
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
    private UserEmailPreferenceMapper emailPreferenceMapper;
    private JavaMailSender mailSender;
    private AsyncMailSender asyncMailSender;

    @BeforeEach
    void setUp() {
        userMapper = mock(UserMapper.class);
        emailPreferenceMapper = mock(UserEmailPreferenceMapper.class);
        mailSender = mock(JavaMailSender.class);
        asyncMailSender = new AsyncMailSender(userMapper, emailPreferenceMapper, mailSender);
    }

    @Test
    void sendsNotificationOnlyToVerifiedOptedInUser() {
        User user = eligibleUser();
        when(userMapper.selectById(1L)).thenReturn(user);
        when(emailPreferenceMapper.selectById(1L)).thenReturn(prefWithAllEnabled());

        asyncMailSender.sendUserNotification(1L, "Subject", "Content", "claim_request");

        verify(mailSender).send(argThat((SimpleMailMessage message) ->
                "user@example.com".equals(message.getTo()[0])
                        && "Subject".equals(message.getSubject())
                        && "Content".equals(message.getText())));
    }

    @Test
    void skipsUserWhoDisabledEmailNotifications() {
        User user = eligibleUser();
        when(userMapper.selectById(1L)).thenReturn(user);
        UserEmailPreference pref = prefWithAllEnabled();
        pref.setClaimRequest(0);
        when(emailPreferenceMapper.selectById(1L)).thenReturn(pref);

        asyncMailSender.sendUserNotification(1L, "Subject", "Content", "claim_request");

        verify(mailSender, never()).send(any(SimpleMailMessage.class));
    }

    @Test
    void fallsBackToNotifyEmailWhenNoPreferenceRecord() {
        User user = eligibleUser();
        when(userMapper.selectById(1L)).thenReturn(user);
        when(emailPreferenceMapper.selectById(1L)).thenReturn(null);

        asyncMailSender.sendUserNotification(1L, "Subject", "Content", "claim_request");

        verify(mailSender).send(any(SimpleMailMessage.class));
    }

    @Test
    void announcementIsSentIndividuallyToEligibleUsers() {
        User first = eligibleUser();
        User second = eligibleUser();
        second.setId(2L);
        second.setEmail("second@example.com");
        when(userMapper.selectList(any())).thenReturn(List.of(first, second));
        when(emailPreferenceMapper.selectById(1L)).thenReturn(prefWithAllEnabled());
        when(emailPreferenceMapper.selectById(2L)).thenReturn(prefWithAllEnabled());

        asyncMailSender.sendAnnouncement("Notice", "Announcement content");

        verify(mailSender, times(2)).send(any(SimpleMailMessage.class));
    }

    @Test
    void systemEmailsAlwaysAllowed() {
        User user = eligibleUser();
        when(userMapper.selectById(1L)).thenReturn(user);
        UserEmailPreference pref = prefWithAllEnabled();
        pref.setSystem(0); // even if system is 0, it should still send
        when(emailPreferenceMapper.selectById(1L)).thenReturn(pref);

        asyncMailSender.sendUserNotification(1L, "Subject", "Content", "system");

        verify(mailSender).send(any(SimpleMailMessage.class));
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

    private UserEmailPreference prefWithAllEnabled() {
        UserEmailPreference pref = new UserEmailPreference();
        pref.setUserId(1L);
        pref.setClaimRequest(1);
        pref.setClaimResult(1);
        pref.setAnnouncement(1);
        pref.setMessage(1);
        pref.setSystem(1);
        return pref;
    }
}
