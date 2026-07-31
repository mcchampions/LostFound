package me.qscbm.projects.lostfound.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

/**
 * 登录防爆破（单机内存实现，线程安全）：
 * <ul>
 *   <li>按用户名统计连续失败次数，达到上限后锁定一段时间；</li>
 *   <li>按 IP 做滑动窗口限流，防止分布式撞库。</li>
 * </ul>
 * 多实例部署时需替换为 Redis 共享计数。
 */
@Slf4j
@Service
public class LoginAttemptService {

    private final ConcurrentHashMap<String, FailureRecord> failuresByUsername = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, ConcurrentLinkedDeque<Long>> attemptsByIp = new ConcurrentHashMap<>();

    @Value("${app.security.login.max-failures:5}")
    private int maxFailures;

    @Value("${app.security.login.lockout-minutes:15}")
    private long lockoutMinutes;

    @Value("${app.security.login.ip-max-attempts:20}")
    private int ipMaxAttempts;

    @Value("${app.security.login.ip-window-minutes:10}")
    private long ipWindowMinutes;

    /** 用户名是否处于锁定状态；锁定到期后自动清除记录。 */
    public boolean isUsernameLocked(String username) {
        if (username == null) {
            return false;
        }
        FailureRecord record = failuresByUsername.get(username);
        if (record == null) {
            return false;
        }
        if (record.failures < maxFailures) {
            return false;
        }
        long remaining = record.lockedUntil - System.currentTimeMillis();
        if (remaining <= 0) {
            failuresByUsername.remove(username);
            return false;
        }
        return true;
    }

    /** 用户名剩余锁定秒数（未锁定时返回 0）。 */
    public long remainingLockSeconds(String username) {
        FailureRecord record = failuresByUsername.get(username);
        if (record == null) {
            return 0;
        }
        return Math.max(0, (record.lockedUntil - System.currentTimeMillis()) / 1000);
    }

    /** IP 在当前滑动窗口内是否已达到请求上限。 */
    public boolean isIpBlocked(String ip) {
        if (ip == null || ip.isBlank()) {
            return false;
        }
        ConcurrentLinkedDeque<Long> timestamps = attemptsByIp.get(ip);
        if (timestamps == null) {
            return false;
        }
        long cutoff = System.currentTimeMillis() - ipWindowMinutes * 60_000L;
        while (!timestamps.isEmpty() && timestamps.peekFirst() < cutoff) {
            timestamps.pollFirst();
        }
        return timestamps.size() >= ipMaxAttempts;
    }

    /** 记录一次失败：用户名计数 +1，达到上限即锁定；IP 时间戳 +1。 */
    public void recordFailure(String username, String ip) {
        if (username != null) {
            failuresByUsername.compute(username, (key, record) -> {
                FailureRecord current = record == null ? new FailureRecord() : record;
                current.failures++;
                if (current.failures >= maxFailures) {
                    current.lockedUntil = System.currentTimeMillis() + lockoutMinutes * 60_000L;
                    log.warn("登录防爆破: 用户名 {} 连续失败 {} 次,锁定 {} 分钟",
                            username, current.failures, lockoutMinutes);
                }
                return current;
            });
        }
        if (ip != null && !ip.isBlank()) {
            attemptsByIp.computeIfAbsent(ip, key -> new ConcurrentLinkedDeque<>())
                    .addLast(System.currentTimeMillis());
        }
    }

    /** 登录成功后清除该用户名的失败记录。 */
    public void reset(String username) {
        if (username != null) {
            failuresByUsername.remove(username);
        }
    }

    private static class FailureRecord {
        private int failures;
        private long lockedUntil;
    }
}
