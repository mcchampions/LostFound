package me.qscbm.projects.lostfound.service.impl;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentLinkedQueue;

/**
 * 邮件发送失败重试队列（单机内存）：失败邮件按退避时间重试，
 * 超过最大次数后放弃并记录错误日志。
 */
@Slf4j
@Component
public class EmailRetryQueue {

    private record PendingMail(String recipient, String subject, String summary,
                               String actionText, String actionUrl,
                               int attempts, long nextAttemptAt) {
    }

    private final ConcurrentLinkedQueue<PendingMail> queue = new ConcurrentLinkedQueue<>();
    private final JavaMailSender mailSender;
    private final EmailContentBuilder emailContentBuilder;

    @Value("${spring.mail.username:}")
    private String mailFrom;

    @Value("${app.mail.retry-max-attempts:5}")
    private int maxAttempts;

    @Value("${app.mail.retry-backoff-seconds:60}")
    private long backoffSeconds;

    public EmailRetryQueue(JavaMailSender mailSender, EmailContentBuilder emailContentBuilder) {
        this.mailSender = mailSender;
        this.emailContentBuilder = emailContentBuilder;
    }

    public void enqueue(String recipient, String subject, String summary,
                        String actionText, String actionUrl) {
        queue.add(new PendingMail(recipient, subject, summary, actionText, actionUrl, 0, 0));
        log.info("邮件重试队列: 已入队 recipient={}, subject={}", recipient, subject);
    }

    @Scheduled(fixedRateString = "${app.mail.retry-interval-ms:300000}")
    public void retryDue() {
        long now = System.currentTimeMillis();
        int processed = 0;
        PendingMail mail;
        while ((mail = queue.peek()) != null && mail.nextAttemptAt() <= now && processed < 50) {
            queue.poll();
            processed++;
            try {
                EmailMessageComposer.send(mailSender, mailFrom, mail.recipient(), mail.subject(),
                        emailContentBuilder.plainBody(mail.summary(), mail.actionText(), mail.actionUrl()),
                        emailContentBuilder.htmlBody(mail.summary(), mail.actionText(), mail.actionUrl()));
                log.info("邮件重试成功: recipient={}", mail.recipient());
            } catch (Exception e) {
                int attempts = mail.attempts() + 1;
                if (attempts >= maxAttempts) {
                    log.error("邮件重试次数耗尽，放弃: recipient={}, subject={}",
                            mail.recipient(), mail.subject(), e);
                } else {
                    queue.add(new PendingMail(mail.recipient(), mail.subject(), mail.summary(),
                            mail.actionText(), mail.actionUrl(),
                            attempts, now + attempts * backoffSeconds * 1000L));
                    log.warn("邮件重试失败({}/{}): recipient={}",
                            attempts, maxAttempts, mail.recipient());
                }
            }
        }
    }
}
