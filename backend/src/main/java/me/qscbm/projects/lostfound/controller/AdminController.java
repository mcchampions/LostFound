package me.qscbm.projects.lostfound.controller;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import me.qscbm.projects.lostfound.common.BusinessException;
import me.qscbm.projects.lostfound.common.PageResult;
import me.qscbm.projects.lostfound.common.Result;
import me.qscbm.projects.lostfound.dto.UserVO;
import me.qscbm.projects.lostfound.entity.FoundItem;
import me.qscbm.projects.lostfound.entity.LostItem;
import me.qscbm.projects.lostfound.entity.OperationLog;
import me.qscbm.projects.lostfound.mapper.FoundItemMapper;
import me.qscbm.projects.lostfound.mapper.LostItemMapper;
import me.qscbm.projects.lostfound.mapper.UserMapper;
import me.qscbm.projects.lostfound.entity.User;
import me.qscbm.projects.lostfound.service.OperationLogService;
import me.qscbm.projects.lostfound.service.StatsService;
import me.qscbm.projects.lostfound.service.UserService;
import me.qscbm.projects.lostfound.service.impl.OperationLogRecorder;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;

import java.io.IOException;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@Validated
public class AdminController {

    private final UserService userService;
    private final StatsService statsService;
    private final OperationLogService logService;
    private final LostItemMapper lostItemMapper;
    private final FoundItemMapper foundItemMapper;
    private final OperationLogRecorder operationLogRecorder;
    private final UserMapper userMapper;

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
        try (SXSSFWorkbook workbook = new SXSSFWorkbook(EXPORT_BATCH_SIZE)) {
            Sheet sheet = workbook.createSheet("用户信息");
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("用户名");
            header.createCell(1).setCellValue("真实姓名");
            header.createCell(2).setCellValue("角色");
            header.createCell(3).setCellValue("状态");
            header.createCell(4).setCellValue("邮箱");
            header.createCell(5).setCellValue("手机号");
            header.createCell(6).setCellValue("注册时间");
            int rowNum = 1;
            long page = 1;
            IPage<User> p;
            do {
                p = userMapper.selectPage(new Page<>(page, EXPORT_BATCH_SIZE), new LambdaQueryWrapper<>());
                for (User user : p.getRecords()) {
                    Row row = sheet.createRow(rowNum++);
                    row.createCell(0).setCellValue(safeCell(user.getUsername()));
                    row.createCell(1).setCellValue(safeCell(user.getRealName()));
                    row.createCell(2).setCellValue(safeCell(user.getRole()));
                    row.createCell(3).setCellValue(safeCell(user.getStatus()));
                    row.createCell(4).setCellValue(safeCell(user.getEmail()));
                    row.createCell(5).setCellValue(safeCell(user.getPhone()));
                    row.createCell(6).setCellValue(user.getCreatedAt() != null
                            ? user.getCreatedAt().toString() : "");
                }
                page++;
            } while (p.getRecords().size() == EXPORT_BATCH_SIZE);
            workbook.write(response.getOutputStream());
            workbook.dispose();
        }
    }

    @GetMapping("/export/lost-items")
    public void exportLostItems(@AuthenticationPrincipal Long userId,
                                HttpServletResponse response) throws IOException {
        operationLogRecorder.log(userId, "EXPORT", "LOST_ITEM", null, "导出失物数据");
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader("Content-Disposition", "attachment; filename=lost-items.xlsx");
        try (SXSSFWorkbook workbook = new SXSSFWorkbook(EXPORT_BATCH_SIZE)) {
            Sheet sheet = workbook.createSheet("失物信息");
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("标题");
            header.createCell(1).setCellValue("描述");
            header.createCell(2).setCellValue("分类ID");
            header.createCell(3).setCellValue("地点");
            header.createCell(4).setCellValue("丢失时间");
            header.createCell(5).setCellValue("状态");
            header.createCell(6).setCellValue("创建时间");
            int rowNum = 1;
            long page = 1;
            IPage<LostItem> p;
            do {
                p = lostItemMapper.selectPage(new Page<>(page, EXPORT_BATCH_SIZE), new LambdaQueryWrapper<>());
                for (LostItem item : p.getRecords()) {
                    Row row = sheet.createRow(rowNum++);
                    row.createCell(0).setCellValue(safeCell(item.getTitle()));
                    row.createCell(1).setCellValue(safeCell(item.getDescription()));
                    row.createCell(2).setCellValue(item.getCategoryId() != null ? item.getCategoryId().toString() : "");
                    row.createCell(3).setCellValue(safeCell(item.getLocation()));
                    row.createCell(4).setCellValue(item.getLostTime() != null ? item.getLostTime().toString() : "");
                    row.createCell(5).setCellValue(item.getStatus() != null ? item.getStatus() : "");
                    row.createCell(6).setCellValue(item.getCreatedAt() != null ? item.getCreatedAt().toString() : "");
                }
                page++;
            } while (p.getRecords().size() == EXPORT_BATCH_SIZE);
            workbook.write(response.getOutputStream());
            workbook.dispose();
        }
    }

    @GetMapping("/export/found-items")
    public void exportFoundItems(@AuthenticationPrincipal Long userId,
                                 HttpServletResponse response) throws IOException {
        operationLogRecorder.log(userId, "EXPORT", "FOUND_ITEM", null, "导出招领数据");
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader("Content-Disposition", "attachment; filename=found-items.xlsx");
        try (SXSSFWorkbook workbook = new SXSSFWorkbook(EXPORT_BATCH_SIZE)) {
            Sheet sheet = workbook.createSheet("拾物信息");
            Row header = sheet.createRow(0);
            header.createCell(0).setCellValue("标题");
            header.createCell(1).setCellValue("描述");
            header.createCell(2).setCellValue("分类ID");
            header.createCell(3).setCellValue("地点");
            header.createCell(4).setCellValue("找到时间");
            header.createCell(5).setCellValue("状态");
            header.createCell(6).setCellValue("创建时间");
            int rowNum = 1;
            long page = 1;
            IPage<FoundItem> p;
            do {
                p = foundItemMapper.selectPage(new Page<>(page, EXPORT_BATCH_SIZE), new LambdaQueryWrapper<>());
                for (FoundItem item : p.getRecords()) {
                    Row row = sheet.createRow(rowNum++);
                    row.createCell(0).setCellValue(safeCell(item.getTitle()));
                    row.createCell(1).setCellValue(safeCell(item.getDescription()));
                    row.createCell(2).setCellValue(item.getCategoryId() != null ? item.getCategoryId().toString() : "");
                    row.createCell(3).setCellValue(safeCell(item.getLocation()));
                    row.createCell(4).setCellValue(item.getFoundTime() != null ? item.getFoundTime().toString() : "");
                    row.createCell(5).setCellValue(item.getStatus() != null ? item.getStatus() : "");
                    row.createCell(6).setCellValue(item.getCreatedAt() != null ? item.getCreatedAt().toString() : "");
                }
                page++;
            } while (p.getRecords().size() == EXPORT_BATCH_SIZE);
            workbook.write(response.getOutputStream());
            workbook.dispose();
        }
    }

    @GetMapping("/logs")
    public Result<PageResult<OperationLog>> logs(
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) Long userId) {
        return Result.success(PageResult.of(logService.page(page, size, action, userId)));
    }

    /** Excel 公式注入防护：以 = + - @ \t \r 开头的内容前置单引号，强制按文本处理。 */
    static String safeCell(String value) {
        if (value == null) {
            return "";
        }
        return value.matches("^[=+@\\-\\t\\r].*") ? "'" + value : value;
    }
}
