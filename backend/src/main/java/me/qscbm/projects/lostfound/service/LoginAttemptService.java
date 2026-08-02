package me.qscbm.projects.lostfound.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

/**
 * 登录防爆破（单机内存实现，线程安全）：
 * <ul>
 *   <li>按「用户名 + IP」组合统计连续失败次数并锁定——单个攻击 IP 无法锁死
 *       某个账号，其他 IP 仍可正常登录；</li>
 *   <li>按 IP 做滑动窗口限流，防止分布式撞库。</li>
 * </ul>
 * 多实例部署时需替换为 Redis 共享计数。
 */
@Slf4j
@Service
public class LoginAttemptService {

    private final ConcurrentHashMap<String, FailureRecord> failuresByKey = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, ConcurrentLinkedDeque<Long>> attemptsByIp = new ConcurrentHashMap<>();

    @Value("${app.security.login.max-failures:5}")
    private int maxFailures;

    @Value("${app.security.login.lockout-minutes:15}")
    private long lockoutMinutes;

    @Value("${app.security.login.ip-max-attempts:20}")
    private int ipMaxAttempts;

    @Value("${app.security.login.ip-window-minutes:10}")
    private long ipWindowMinutes;

    /** 指定用户名+IP 组合是否处于锁定状态；锁定到期自动清除记录。 */
    public boolean isLocked(String username, String ip) {
        if (username == null) {
            return false;
        }
        FailureRecord record = failuresByKey.get(key(username, ip));
        if (record == null) {
            return false;
        }
        if (record.failures < maxFailures) {
            return false;
        }
        long remaining = record.lockedUntil - System.currentTimeMillis();
        if (remaining <= 0) {
            failuresByKey.remove(key(username, ip));
            return false;
        }
        return true;
    }

    /** 指定组合剩余锁定秒数（未锁定时返回 0）。 */
    public long remainingLockSeconds(String username, String ip) {
        FailureRecord record = failuresByKey.get(key(username, ip));
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

    /** 记录一次失败：用户名+IP 计数 +1，达到上限即锁定该组合；IP 时间戳 +1。 */
    public void recordFailure(String username, String ip) {
        if (username != null) {
            String k = key(username, ip);
            failuresByKey.compute(k, (key, record) -> {
                FailureRecord current = record == null ? new FailureRecord() : record;
                current.failures++;
                current.lastUpdated = System.currentTimeMillis();
                if (current.failures >= maxFailures) {
                    current.lockedUntil = System.currentTimeMillis() + lockoutMinutes * 60_000L;
                    log.warn("登录防爆破: 用户名 {} (IP {}) 连续失败 {} 次,锁定 {} 分钟",
                            username, ip, current.failures, lockoutMinutes);
                }
                return current;
            });
        }
        if (ip != null && !ip.isBlank()) {
            attemptsByIp.computeIfAbsent(ip, key -> new ConcurrentLinkedDeque<>())
                    .addLast(System.currentTimeMillis());
        }
    }

    /** 登录成功后清除该用户名的全部失败记录（不限 IP）。 */
    public void reset(String username) {
        if (username == null) {
            return;
        }
        String prefix = username + "|";
        failuresByKey.keySet().removeIf(k -> k.startsWith(prefix));
    }

    /** 每小时清理过期记录，避免长期运行内存残留。 */
    @Scheduled(fixedRate = 3_600_000)
    public void cleanupStaleEntries() {
        long cutoff = System.currentTimeMillis() - Math.max(lockoutMinutes, 60) * 60_000L;
        failuresByKey.entrySet().removeIf(entry ->
                entry.getValue().lastUpdated < cutoff);
        long ipCutoff = System.currentTimeMillis() - ipWindowMinutes * 60_000L;
        attemptsByIp.forEach((ip, timestamps) -> {
            while (!timestamps.isEmpty() && timestamps.peekFirst() < ipCutoff) {
                timestamps.pollFirst();
            }
            if (timestamps.isEmpty()) {
                attemptsByIp.remove(ip);
            }
        });
    }

    private String key(String username, String ip) {
        return username + "|" + (ip == null ? "" : ip);
    }

    private static class FailureRecord {
        private int failures;
        private long lockedUntil;
        private long lastUpdated;
    }
}
