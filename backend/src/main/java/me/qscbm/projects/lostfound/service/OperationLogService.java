package me.qscbm.projects.lostfound.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import me.qscbm.projects.lostfound.entity.OperationLog;

public interface OperationLogService {
    IPage<OperationLog> page(int page, int size);
    void log(Long userId, String action, String targetType, Long targetId, String description, String ip);
}
