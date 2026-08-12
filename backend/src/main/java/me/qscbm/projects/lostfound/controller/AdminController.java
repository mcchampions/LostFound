package me.qscbm.projects.lostfound.controller;

import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import com.baomidou.mybatisplus.core.metadata.IPage;
import org.springframework.beans.factory.annotation.Autowired;
import lombok.RequiredArgsConstructor;
import me.qscbm.projects.lostfound.common.BusinessException;
import me.qscbm.projects.lostfound.common.PageResult;
import me.qscbm.projects.lostfound.common.Result;
import me.qscbm.projects.lostfound.dto.UserVO;
import me.qscbm.projects.lostfound.dto.LostItemVO;
import me.qscbm.projects.lostfound.dto.FoundItemVO;
import me.qscbm.projects.lostfound.entity.OperationLog;
import me.qscbm.projects.lostfound.service.OperationLogService;
import me.qscbm.projects.lostfound.service.StatsService;
import me.qscbm.projects.lostfound.service.UserService;
import me.qscbm.projects.lostfound.service.LostItemService;
import me.qscbm.projects.lostfound.service.FoundItemService;
import me.qscbm.projects.lostfound.service.impl.OperationLogRecorder;
import me.qscbm.projects.lostfound.common.ExcelCellSanitizer;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
@Validated
public class AdminController {

    private final UserService userService;
    private final LostItemService lostItemService;
    private final FoundItemService foundItemService;
    private final StatsService statsService;
    private final OperationLogService logService;
    private final OperationLogRecorder operationLogRecorder;
    private final me.qscbm.projects.lostfound.service.impl.AdminExportService adminExportService;

    @Autowired
    public AdminController(UserService userService, LostItemService lostItemService,
                           FoundItemService foundItemService, StatsService statsService,
                           OperationLogService logService, OperationLogRecorder operationLogRecorder,
                           me.qscbm.projects.lostfound.service.impl.AdminExportService adminExportService) {
        this.userService = userService;
        this.lostItemService = lostItemService;
        this.foundItemService = foundItemService;
        this.statsService = statsService;
        this.logService = logService;
        this.operationLogRecorder = operationLogRecorder;
        this.adminExportService = adminExportService;
    }


    @GetMapping("/users")
    public Result<PageResult<UserVO>> listUsers(
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(required = false) String keyword) {
        IPage<UserVO> p = userService.listUsers(page, size, keyword);
        return Result.success(PageResult.of(p));
    }

    @PutMapping("/users/{id}/status")
    public Result<?> updateUserStatus(@AuthenticationPrincipal Long operatorId,
                                      @PathVariable Long id, @RequestBody Map<String, String> body) {
        String status = body.get("status");
        if (status == null || status.isBlank()) throw new BusinessException("状态不能为空");
        userService.updateStatus(id, status);
        operationLogRecorder.log(operatorId, "UPDATE_USER_STATUS", "USER", id,
                "修改用户状态为 " + status.toUpperCase());
        return Result.success();
    }

    @DeleteMapping("/users/{id}")
    public Result<?> deleteUser(@AuthenticationPrincipal Long operatorId,
                                @PathVariable Long id) {
        userService.softDelete(id, operatorId);
        return Result.success();
    }

    @GetMapping("/stats")
    public Result<Map<String, Object>> stats() {
        return Result.success(statsService.getDashboard());
    }

    @GetMapping("/stats/trend")
    public Result<List<Map<String, Object>>> trend(
            @RequestParam(defaultValue = "7") @Min(1) @Max(30) int days) {
        return Result.success(statsService.getDailyTrend(days));
    }

    private static final int EXPORT_BATCH_SIZE = 500;

    @GetMapping("/export/users")
    public void exportUsers(@AuthenticationPrincipal Long userId,
                            HttpServletResponse response) throws IOException {
        operationLogRecorder.log(userId, "EXPORT", "USER", null, "导出用户数据");
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader("Content-Disposition", "attachment; filename=users.xlsx");
        adminExportService.exportUsers(response);
    }

    @GetMapping("/export/lost-items")
    public void exportLostItems(@AuthenticationPrincipal Long userId,
                                HttpServletResponse response) throws IOException {
        operationLogRecorder.log(userId, "EXPORT", "LOST_ITEM", null, "导出失物数据");
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader("Content-Disposition", "attachment; filename=lost-items.xlsx");
        adminExportService.exportLostItems(response);
    }

    @GetMapping("/export/found-items")
    public void exportFoundItems(@AuthenticationPrincipal Long userId,
                                 HttpServletResponse response) throws IOException {
        operationLogRecorder.log(userId, "EXPORT", "FOUND_ITEM", null, "导出招领数据");
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader("Content-Disposition", "attachment; filename=found-items.xlsx");
        adminExportService.exportFoundItems(response);
    }

    @GetMapping("/logs")
    public Result<PageResult<OperationLog>> logs(
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) Long userId) {
        return Result.success(PageResult.of(logService.page(page, size, action, userId)));
    }

    @GetMapping("/trash/lost-items")
    public Result<PageResult<LostItemVO>> trashLostItems(
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(required = false) String keyword) {
        return Result.success(PageResult.of(lostItemService.trashPage(page, size, keyword)));
    }

    @GetMapping("/trash/found-items")
    public Result<PageResult<FoundItemVO>> trashFoundItems(
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(required = false) String keyword) {
        return Result.success(PageResult.of(foundItemService.trashPage(page, size, keyword)));
    }

    @GetMapping("/trash/users")
    public Result<PageResult<UserVO>> trashUsers(
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(required = false) String keyword) {
        return Result.success(PageResult.of(userService.trashPage(page, size, keyword)));
    }

    @PutMapping("/trash/lost-items/{id}/restore")
    public Result<?> restoreLostItem(@AuthenticationPrincipal Long operatorId,
                                     @PathVariable Long id) {
        lostItemService.restore(id, operatorId);
        return Result.success();
    }

    @DeleteMapping("/trash/lost-items/{id}")
    public Result<?> purgeLostItem(@AuthenticationPrincipal Long operatorId,
                                   @PathVariable Long id) {
        lostItemService.purge(id, operatorId);
        return Result.success();
    }

    @PutMapping("/trash/found-items/{id}/restore")
    public Result<?> restoreFoundItem(@AuthenticationPrincipal Long operatorId,
                                      @PathVariable Long id) {
        foundItemService.restore(id, operatorId);
        return Result.success();
    }

    @DeleteMapping("/trash/found-items/{id}")
    public Result<?> purgeFoundItem(@AuthenticationPrincipal Long operatorId,
                                    @PathVariable Long id) {
        foundItemService.purge(id, operatorId);
        return Result.success();
    }

    @PutMapping("/trash/users/{id}/restore")
    public Result<?> restoreUser(@AuthenticationPrincipal Long operatorId,
                                 @PathVariable Long id) {
        userService.restoreUser(id, operatorId);
        return Result.success();
    }

    @GetMapping("/export/logs")
    public void exportLogs(@AuthenticationPrincipal Long userId,
                           HttpServletResponse response) throws IOException {
        operationLogRecorder.log(userId, "EXPORT", "OPERATION_LOG", null, "导出操作日志");
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader("Content-Disposition", "attachment; filename=operation-logs.xlsx");
        adminExportService.exportLogs(response);
    }

    /** Excel 公式注入防护：以 = + - @ \t \r 开头的内容前置单引号，强制按文本处理。 */
    public static String safeCell(String value) {
        return ExcelCellSanitizer.safeCell(value);
    }
}
