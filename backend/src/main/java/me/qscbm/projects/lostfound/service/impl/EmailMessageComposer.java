package me.qscbm.projects.lostfound.service.impl;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;

/** 邮件发送共用逻辑：纯文本 + HTML 双正文。 */
public final class EmailMessageComposer {

    private EmailMessageComposer() {
    }

    public static void send(JavaMailSender mailSender, String from, String recipient,
                            String subject, String plainText, String htmlText) throws MessagingException {
        MimeMessage message = mailSender.createMimeMessage();
        MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
        if (from != null && !from.isBlank()) {
            helper.setFrom(from);
        }
        helper.setTo(recipient);
        helper.setSubject(subject);
        helper.setText(plainText, htmlText);
        mailSender.send(message);
    }
}
