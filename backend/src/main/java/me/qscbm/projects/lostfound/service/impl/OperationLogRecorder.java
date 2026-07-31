package me.qscbm.projects.lostfound.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.qscbm.projects.lostfound.service.OperationLogService;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

/**
 * 业务操作审计记录器：从当前请求上下文提取 IP，写入 operation_log 表。
 * 审计失败只告警，不影响业务主流程。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OperationLogRecorder {

    private final OperationLogService operationLogService;

    public void log(Long userId, String action, String targetType, Long targetId, String description) {
        try {
            String ip = null;
            ServletRequestAttributes attrs =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null && attrs.getRequest() != null) {
                ip = attrs.getRequest().getRemoteAddr();
            }
            operationLogService.log(userId, action, targetType, targetId, description, ip);
        } catch (Exception e) {
            log.warn("操作日志写入失败: action={}, targetType={}, targetId={}",
                    action, targetType, targetId, e);
        }
    }
}
