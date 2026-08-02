package me.qscbm.projects.lostfound.service.impl;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ConcurrentLinkedQueue;

/**
 * 邮件发送失败重试队列（单机内存）：
 * 每轮先整体取出队列再处理全部到期邮件（避免队头未到期阻塞后续邮件），
 * 退避递增，超过最大次数或队列容量上限后放弃并记录错误日志。
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

    @Value("${app.mail.retry-queue-capacity:10000}")
    private int queueCapacity;

    @Value("${app.mail.retry-batch-size:100}")
    private int batchSize;

    public EmailRetryQueue(JavaMailSender mailSender, EmailContentBuilder emailContentBuilder) {
        this.mailSender = mailSender;
        this.emailContentBuilder = emailContentBuilder;
    }

    public void enqueue(String recipient, String subject, String summary,
                        String actionText, String actionUrl) {
        if (queue.size() >= queueCapacity) {
            log.error("邮件重试队列已满（{}），丢弃: recipient={}, subject={}",
                    queueCapacity, recipient, subject);
            return;
        }
        queue.add(new PendingMail(recipient, subject, summary, actionText, actionUrl, 0, 0));
        log.info("邮件重试队列: 已入队 recipient={}, subject={}", recipient, subject);
    }

    @Scheduled(fixedRateString = "${app.mail.retry-interval-ms:300000}")
    public void retryDue() {
        long now = System.currentTimeMillis();
        List<PendingMail> snapshot = new ArrayList<>();
        PendingMail mail;
        while ((mail = queue.poll()) != null) {
            snapshot.add(mail);
        }
        if (snapshot.isEmpty()) {
            return;
        }
        int processed = 0;
        for (PendingMail item : snapshot) {
            if (item.nextAttemptAt() > now) {
                queue.add(item);
                continue;
            }
            if (processed >= batchSize) {
                queue.add(item);
                continue;
            }
            processed++;
            try {
                EmailMessageComposer.send(mailSender, mailFrom, item.recipient(), item.subject(),
                        emailContentBuilder.plainBody(item.summary(), item.actionText(), item.actionUrl()),
                        emailContentBuilder.htmlBody(item.summary(), item.actionText(), item.actionUrl()));
                log.info("邮件重试成功: recipient={}", item.recipient());
            } catch (Exception e) {
                int attempts = item.attempts() + 1;
                if (attempts >= maxAttempts) {
                    log.error("邮件重试次数耗尽，放弃: recipient={}, subject={}",
                            item.recipient(), item.subject(), e);
                } else {
                    queue.add(new PendingMail(item.recipient(), item.subject(), item.summary(),
                            item.actionText(), item.actionUrl(),
                            attempts, now + attempts * backoffSeconds * 1000L));
                    log.warn("邮件重试失败({}/{}): recipient={}",
                            attempts, maxAttempts, item.recipient());
                }
            }
        }
    }
}
