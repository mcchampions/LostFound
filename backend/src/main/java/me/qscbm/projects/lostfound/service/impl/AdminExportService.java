package me.qscbm.projects.lostfound.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import me.qscbm.projects.lostfound.entity.FoundItem;
import me.qscbm.projects.lostfound.entity.LostItem;
import me.qscbm.projects.lostfound.entity.OperationLog;
import me.qscbm.projects.lostfound.entity.User;
import me.qscbm.projects.lostfound.mapper.FoundItemMapper;
import me.qscbm.projects.lostfound.mapper.LostItemMapper;
import me.qscbm.projects.lostfound.mapper.OperationLogMapper;
import me.qscbm.projects.lostfound.mapper.UserMapper;
import me.qscbm.projects.lostfound.common.ExcelCellSanitizer;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.xssf.streaming.SXSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.IOException;

@Service
@RequiredArgsConstructor
public class AdminExportService {

    private static final int BATCH_SIZE = 500;

    private final UserMapper userMapper;
    private final LostItemMapper lostItemMapper;
    private final FoundItemMapper foundItemMapper;
    private final OperationLogMapper operationLogMapper;

    public void exportUsers(HttpServletResponse response) throws IOException {
        try (SXSSFWorkbook workbook = new SXSSFWorkbook(BATCH_SIZE)) {
            Sheet sheet = workbook.createSheet("用户信息");
            header(sheet, "用户名", "真实姓名", "角色", "状态", "邮箱", "手机号", "注册时间");
            int rowNum = 1;
            for (long page = 1; ; page++) {
                IPage<User> result = userMapper.selectPage(new Page<>(page, BATCH_SIZE),
                        new LambdaQueryWrapper<User>()
                                .isNull(User::getDeletedAt)
                                .orderByAsc(User::getId));
                for (User user : result.getRecords()) {
                    Row row = sheet.createRow(rowNum++);
                    text(row, 0, user.getUsername());
                    text(row, 1, user.getRealName());
                    text(row, 2, user.getRole());
                    text(row, 3, user.getStatus());
                    text(row, 4, user.getEmail());
                    text(row, 5, user.getPhone());
                    text(row, 6, user.getCreatedAt());
                }
                if (result.getRecords().size() < BATCH_SIZE) break;
            }
            workbook.write(response.getOutputStream());
        }
    }

    public void exportLostItems(HttpServletResponse response) throws IOException {
        try (SXSSFWorkbook workbook = new SXSSFWorkbook(BATCH_SIZE)) {
            Sheet sheet = workbook.createSheet("失物信息");
            header(sheet, "标题", "描述", "分类ID", "地点", "丢失时间", "状态", "创建时间");
            int rowNum = 1;
            for (long page = 1; ; page++) {
                IPage<LostItem> result = lostItemMapper.selectPage(new Page<>(page, BATCH_SIZE),
                        new LambdaQueryWrapper<LostItem>()
                                .isNull(LostItem::getDeletedAt)
                                .orderByAsc(LostItem::getId));
                for (LostItem item : result.getRecords()) {
                    Row row = sheet.createRow(rowNum++);
                    text(row, 0, item.getTitle()); text(row, 1, item.getDescription());
                    text(row, 2, item.getCategoryId()); text(row, 3, item.getLocation());
                    text(row, 4, item.getLostTime()); text(row, 5, item.getStatus());
                    text(row, 6, item.getCreatedAt());
                }
                if (result.getRecords().size() < BATCH_SIZE) break;
            }
            workbook.write(response.getOutputStream());
        }
    }

    public void exportFoundItems(HttpServletResponse response) throws IOException {
        try (SXSSFWorkbook workbook = new SXSSFWorkbook(BATCH_SIZE)) {
            Sheet sheet = workbook.createSheet("拾物信息");
            header(sheet, "标题", "描述", "分类ID", "地点", "找到时间", "状态", "创建时间");
            int rowNum = 1;
            for (long page = 1; ; page++) {
                IPage<FoundItem> result = foundItemMapper.selectPage(new Page<>(page, BATCH_SIZE),
                        new LambdaQueryWrapper<FoundItem>()
                                .isNull(FoundItem::getDeletedAt)
                                .orderByAsc(FoundItem::getId));
                for (FoundItem item : result.getRecords()) {
                    Row row = sheet.createRow(rowNum++);
                    text(row, 0, item.getTitle()); text(row, 1, item.getDescription());
                    text(row, 2, item.getCategoryId()); text(row, 3, item.getLocation());
                    text(row, 4, item.getFoundTime()); text(row, 5, item.getStatus());
                    text(row, 6, item.getCreatedAt());
                }
                if (result.getRecords().size() < BATCH_SIZE) break;
            }
            workbook.write(response.getOutputStream());
        }
    }

    public void exportLogs(HttpServletResponse response) throws IOException {
        try (SXSSFWorkbook workbook = new SXSSFWorkbook(BATCH_SIZE)) {
            Sheet sheet = workbook.createSheet("操作日志");
            header(sheet, "ID", "用户ID", "操作", "目标类型", "目标ID", "描述", "IP", "时间");
            int rowNum = 1;
            for (long page = 1; ; page++) {
                IPage<OperationLog> result = operationLogMapper.selectPage(new Page<>(page, BATCH_SIZE),
                        new LambdaQueryWrapper<OperationLog>().orderByAsc(OperationLog::getId));
                for (OperationLog log : result.getRecords()) {
                    Row row = sheet.createRow(rowNum++);
                    text(row, 0, log.getId());
                    text(row, 1, log.getUserId());
                    text(row, 2, log.getAction());
                    text(row, 3, log.getTargetType());
                    text(row, 4, log.getTargetId());
                    text(row, 5, log.getDescription());
                    text(row, 6, log.getIp());
                    text(row, 7, log.getCreatedAt());
                }
                if (result.getRecords().size() < BATCH_SIZE) break;
            }
            workbook.write(response.getOutputStream());
        }
    }

    private void header(Sheet sheet, String... values) {
        Row row = sheet.createRow(0);
        for (int index = 0; index < values.length; index++) row.createCell(index).setCellValue(values[index]);
    }

    private void text(Row row, int index, Object value) {
        row.createCell(index).setCellValue(ExcelCellSanitizer.safeCell(value == null ? "" : value.toString()));
    }
}
