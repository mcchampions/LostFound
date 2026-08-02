package me.qscbm.projects.lostfound.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import me.qscbm.projects.lostfound.entity.OperationLog;
import me.qscbm.projects.lostfound.mapper.OperationLogMapper;
import me.qscbm.projects.lostfound.service.OperationLogService;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class OperationLogServiceImpl implements OperationLogService {

    private final OperationLogMapper operationLogMapper;

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
}
