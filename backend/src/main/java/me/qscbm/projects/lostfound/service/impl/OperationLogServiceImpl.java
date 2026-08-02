package me.qscbm.projects.lostfound.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.qscbm.projects.lostfound.entity.OperationLog;
import me.qscbm.projects.lostfound.mapper.OperationLogMapper;
import me.qscbm.projects.lostfound.service.OperationLogService;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;

import java.time.LocalDateTime;

@Slf4j
@Service
@RequiredArgsConstructor
public class OperationLogServiceImpl implements OperationLogService {

    private final OperationLogMapper operationLogMapper;

    @Value("${app.audit.log-retention-days:365}")
    private int retentionDays;

    @Override
    public IPage<OperationLog> page(int page, int size, String action, Long userId) {
        LambdaQueryWrapper<OperationLog> qw = new LambdaQueryWrapper<>();
        if (action != null && !action.isBlank()) {
            qw.like(OperationLog::getAction, action.trim());
        }
        if (userId != null) {
            qw.eq(OperationLog::getUserId, userId);
        }
        qw.orderByDesc(OperationLog::getCreatedAt);
        return operationLogMapper.selectPage(new Page<>(page, size), qw);
    }

    @Override
    public void log(Long userId, String action, String targetType, Long targetId, String description, String ip) {
        OperationLog log = new OperationLog();
        log.setUserId(userId);
        log.setAction(action);
        log.setTargetType(targetType);
        log.setTargetId(targetId);
        log.setDescription(description);
        log.setIp(ip);
        operationLogMapper.insert(log);
    }

    /** 每日凌晨清理超过保留期的操作日志，防止无界增长。 */
    @Scheduled(cron = "0 0 4 * * *")
    public void cleanupExpiredLogs() {
        int deleted = operationLogMapper.delete(new LambdaQueryWrapper<OperationLog>()
                .lt(OperationLog::getCreatedAt, LocalDateTime.now().minusDays(retentionDays)));
        if (deleted > 0) {
            log.info("操作日志清理: 删除 {} 条超过 {} 天的记录", deleted, retentionDays);
        }
    }
}
