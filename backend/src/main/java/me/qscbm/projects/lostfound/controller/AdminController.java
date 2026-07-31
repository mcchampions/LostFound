package me.qscbm.projects.lostfound.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
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
import me.qscbm.projects.lostfound.service.OperationLogService;
import me.qscbm.projects.lostfound.service.StatsService;
import me.qscbm.projects.lostfound.service.UserService;
import me.qscbm.projects.lostfound.service.impl.OperationLogRecorder;
import org.apache.poi.xssf.usermodel.XSSFRow;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
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

    @GetMapping("/export/lost-items")
    public void exportLostItems(@AuthenticationPrincipal Long userId,
                                HttpServletResponse response) throws IOException {
        operationLogRecorder.log(userId, "EXPORT", "LOST_ITEM", null, "导出失物数据");
        List<LostItem> items = lostItemMapper.selectList(null);
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader("Content-Disposition", "attachment; filename=lost-items.xlsx");
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            XSSFSheet sheet = workbook.createSheet("失物信息");
            XSSFRow header = sheet.createRow(0);
            header.createCell(0).setCellValue("标题");
            header.createCell(1).setCellValue("描述");
            header.createCell(2).setCellValue("分类ID");
            header.createCell(3).setCellValue("地点");
            header.createCell(4).setCellValue("丢失时间");
            header.createCell(5).setCellValue("状态");
            header.createCell(6).setCellValue("创建时间");
            for (int i = 0; i < items.size(); i++) {
                LostItem item = items.get(i);
                XSSFRow row = sheet.createRow(i + 1);
                row.createCell(0).setCellValue(item.getTitle() != null ? item.getTitle() : "");
                row.createCell(1).setCellValue(item.getDescription() != null ? item.getDescription() : "");
                row.createCell(2).setCellValue(item.getCategoryId() != null ? item.getCategoryId().toString() : "");
                row.createCell(3).setCellValue(item.getLocation() != null ? item.getLocation() : "");
                row.createCell(4).setCellValue(item.getLostTime() != null ? item.getLostTime().toString() : "");
                row.createCell(5).setCellValue(item.getStatus() != null ? item.getStatus() : "");
                row.createCell(6).setCellValue(item.getCreatedAt() != null ? item.getCreatedAt().toString() : "");
            }
            workbook.write(response.getOutputStream());
        }
    }

    @GetMapping("/export/found-items")
    public void exportFoundItems(@AuthenticationPrincipal Long userId,
                                 HttpServletResponse response) throws IOException {
        operationLogRecorder.log(userId, "EXPORT", "FOUND_ITEM", null, "导出招领数据");
        List<FoundItem> items = foundItemMapper.selectList(null);
        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader("Content-Disposition", "attachment; filename=found-items.xlsx");
        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            XSSFSheet sheet = workbook.createSheet("拾物信息");
            XSSFRow header = sheet.createRow(0);
            header.createCell(0).setCellValue("标题");
            header.createCell(1).setCellValue("描述");
            header.createCell(2).setCellValue("分类ID");
            header.createCell(3).setCellValue("地点");
            header.createCell(4).setCellValue("找到时间");
            header.createCell(5).setCellValue("状态");
            header.createCell(6).setCellValue("创建时间");
            for (int i = 0; i < items.size(); i++) {
                FoundItem item = items.get(i);
                XSSFRow row = sheet.createRow(i + 1);
                row.createCell(0).setCellValue(item.getTitle() != null ? item.getTitle() : "");
                row.createCell(1).setCellValue(item.getDescription() != null ? item.getDescription() : "");
                row.createCell(2).setCellValue(item.getCategoryId() != null ? item.getCategoryId().toString() : "");
                row.createCell(3).setCellValue(item.getLocation() != null ? item.getLocation() : "");
                row.createCell(4).setCellValue(item.getFoundTime() != null ? item.getFoundTime().toString() : "");
                row.createCell(5).setCellValue(item.getStatus() != null ? item.getStatus() : "");
                row.createCell(6).setCellValue(item.getCreatedAt() != null ? item.getCreatedAt().toString() : "");
            }
            workbook.write(response.getOutputStream());
        }
    }

    @GetMapping("/logs")
    public Result<PageResult<OperationLog>> logs(
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return Result.success(PageResult.of(logService.page(page, size)));
    }
}
