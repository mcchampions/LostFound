package me.qscbm.projects.lostfound.service.impl;

import me.qscbm.projects.lostfound.entity.User;
import me.qscbm.projects.lostfound.entity.UserEmailPreference;
import me.qscbm.projects.lostfound.mapper.UserEmailPreferenceMapper;
import me.qscbm.projects.lostfound.mapper.UserMapper;
import jakarta.mail.Multipart;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import org.mockito.ArgumentCaptor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mail.javamail.JavaMailSender;

import java.util.List;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class AsyncMailSenderTest {

    private UserMapper userMapper;
    private UserEmailPreferenceMapper emailPreferenceMapper;
    private JavaMailSender mailSender;
    private AsyncMailSender asyncMailSender;
    private EmailRetryQueue emailRetryQueue;

    @BeforeEach
    void setUp() {
        userMapper = mock(UserMapper.class);
        emailPreferenceMapper = mock(UserEmailPreferenceMapper.class);
        mailSender = mock(JavaMailSender.class);
        EmailContentBuilder emailContentBuilder = new EmailContentBuilder("http://localhost:5173");
        emailRetryQueue = mock(EmailRetryQueue.class);
        when(mailSender.createMimeMessage())
                .thenReturn(new MimeMessage(Session.getDefaultInstance(new Properties())));
        asyncMailSender = new AsyncMailSender(
                userMapper, emailPreferenceMapper, mailSender, emailContentBuilder, emailRetryQueue);
    }

    @Test
    void sendsNotificationOnlyToVerifiedOptedInUser() throws Exception {
        User user = eligibleUser();
        when(userMapper.selectById(1L)).thenReturn(user);
        when(emailPreferenceMapper.selectById(1L)).thenReturn(prefWithAllEnabled());

        asyncMailSender.sendUserNotification(1L, "Subject", "Content", "claim_request");

        ArgumentCaptor<MimeMessage> captor = ArgumentCaptor.forClass(MimeMessage.class);
        verify(mailSender).send(captor.capture());
        MimeMessage message = captor.getValue();
        assertThat(message.getSubject()).isEqualTo("Subject");
        String body = readBody(message.getContent());
        assertThat(body).contains("Content");
        assertThat(body).contains("http://localhost:5173/claims");
    }

    @Test
    void skipsUserWhoDisabledEmailNotifications() {
        User user = eligibleUser();
        when(userMapper.selectById(1L)).thenReturn(user);
        UserEmailPreference pref = prefWithAllEnabled();
        pref.setClaimRequest(0);
        when(emailPreferenceMapper.selectById(1L)).thenReturn(pref);

        asyncMailSender.sendUserNotification(1L, "Subject", "Content", "claim_request");

        verify(mailSender, never()).send(any(MimeMessage.class));
    }

    @Test
    void fallsBackToNotifyEmailWhenNoPreferenceRecord() {
        User user = eligibleUser();
        when(userMapper.selectById(1L)).thenReturn(user);
        when(emailPreferenceMapper.selectById(1L)).thenReturn(null);

        asyncMailSender.sendUserNotification(1L, "Subject", "Content", "claim_request");

        verify(mailSender).send(any(MimeMessage.class));
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

        verify(mailSender, times(2)).send(any(MimeMessage.class));
    }

    @Test
    void systemEmailsAlwaysAllowed() {
        User user = eligibleUser();
        when(userMapper.selectById(1L)).thenReturn(user);
        UserEmailPreference pref = prefWithAllEnabled();
        pref.setSystemMessage(0); // even if system is 0, it should still send
        when(emailPreferenceMapper.selectById(1L)).thenReturn(pref);

        asyncMailSender.sendUserNotification(1L, "Subject", "Content", "system_message");

        verify(mailSender).send(any(MimeMessage.class));
    }

    @Test
    void failedNotificationIsQueuedForRetry() throws Exception {
        User user = eligibleUser();
        when(userMapper.selectById(1L)).thenReturn(user);
        when(emailPreferenceMapper.selectById(1L)).thenReturn(prefWithAllEnabled());
        doThrow(new RuntimeException("smtp unavailable")).when(mailSender).send(any(MimeMessage.class));

        asyncMailSender.sendUserNotification(1L, "Subject", "Content", "claim_request");

        verify(mailSender).send(any(MimeMessage.class));
        verify(emailRetryQueue).enqueue(eq("user@example.com"), eq("Subject"), eq("Content"),
                eq("查看认领申请"), eq("/claims"));
    }

    private String readBody(Object content) throws Exception {
        if (content instanceof String text) {
            return text;
        }
        if (content instanceof Multipart multipart) {
            StringBuilder sb = new StringBuilder();
            for (int i = 0; i < multipart.getCount(); i++) {
                sb.append(readBody(multipart.getBodyPart(i).getContent()));
            }
            return sb.toString();
        }
        return "";
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
        pref.setSystemMessage(1);
        return pref;
    }
}
