package me.qscbm.projects.lostfound.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.RequiredArgsConstructor;
import me.qscbm.projects.lostfound.common.AppTime;
import me.qscbm.projects.lostfound.entity.ClaimApplication;
import me.qscbm.projects.lostfound.entity.Category;
import me.qscbm.projects.lostfound.entity.FoundItem;
import me.qscbm.projects.lostfound.entity.LostItem;
import me.qscbm.projects.lostfound.entity.User;
import me.qscbm.projects.lostfound.entity.enums.ClaimStatus;
import me.qscbm.projects.lostfound.entity.enums.FoundItemStatus;
import me.qscbm.projects.lostfound.entity.enums.LostItemStatus;
import me.qscbm.projects.lostfound.entity.enums.UserStatus;
import me.qscbm.projects.lostfound.mapper.ClaimApplicationMapper;
import me.qscbm.projects.lostfound.mapper.CategoryMapper;
import me.qscbm.projects.lostfound.mapper.FoundItemMapper;
import me.qscbm.projects.lostfound.mapper.LostItemMapper;
import me.qscbm.projects.lostfound.mapper.UserMapper;
import me.qscbm.projects.lostfound.service.StatsService;
import org.springframework.stereotype.Service;

import java.util.*;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class StatsServiceImpl implements StatsService {

    private final LostItemMapper lostItemMapper;
    private final FoundItemMapper foundItemMapper;
    private final UserMapper userMapper;
    private final CategoryMapper categoryMapper;
    private final ClaimApplicationMapper claimApplicationMapper;

    @Override
    public Map<String, Object> getDashboard() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("lostCount", lostItemMapper.selectCount(
                new LambdaQueryWrapper<LostItem>().isNull(LostItem::getDeletedAt)));
        result.put("foundCount", foundItemMapper.selectCount(
                new LambdaQueryWrapper<FoundItem>().isNull(FoundItem::getDeletedAt)));
        result.put("claimedCount", foundItemMapper.selectCount(
                new LambdaQueryWrapper<FoundItem>()
                        .eq(FoundItem::getStatus, FoundItemStatus.CLAIMED.getValue())
                        .isNull(FoundItem::getDeletedAt)));
        result.put("foundLostCount", lostItemMapper.selectCount(
                new LambdaQueryWrapper<LostItem>()
                        .eq(LostItem::getStatus, LostItemStatus.FOUND.getValue())
                        .isNull(LostItem::getDeletedAt)));
        result.put("pendingUserCount", userMapper.selectCount(
                new LambdaQueryWrapper<User>().eq(User::getStatus, UserStatus.PENDING.getValue())));

        LocalDateTime todayStart = AppTime.today().atStartOfDay();
        result.put("todayLostCount", lostItemMapper.selectCount(
                new LambdaQueryWrapper<LostItem>()
                        .ge(LostItem::getCreatedAt, todayStart)
                        .isNull(LostItem::getDeletedAt)));
        result.put("todayFoundCount", foundItemMapper.selectCount(
                new LambdaQueryWrapper<FoundItem>()
                        .ge(FoundItem::getCreatedAt, todayStart)
                        .isNull(FoundItem::getDeletedAt)));

        Long totalClaims = claimApplicationMapper.selectCount(null);
        Long pendingClaims = claimApplicationMapper.selectCount(
                new LambdaQueryWrapper<ClaimApplication>()
                        .eq(ClaimApplication::getStatus, ClaimStatus.PENDING.getValue()));
        Long approvedClaims = claimApplicationMapper.selectCount(
                new LambdaQueryWrapper<ClaimApplication>()
                        .eq(ClaimApplication::getStatus, ClaimStatus.APPROVED.getValue()));
        result.put("totalClaims", totalClaims);
        result.put("pendingClaims", pendingClaims);
        double claimConversionRate = totalClaims == null || totalClaims == 0
                ? 0.0
                : Math.round(approvedClaims * 1000.0 / totalClaims) / 10.0;
        result.put("claimConversionRate", claimConversionRate);

        Long resolvedLostCount = lostItemMapper.selectCount(
                new LambdaQueryWrapper<LostItem>().eq(LostItem::getStatus, LostItemStatus.FOUND.getValue()));
        Long resolvedFoundCount = foundItemMapper.selectCount(
                new LambdaQueryWrapper<FoundItem>().eq(FoundItem::getStatus, FoundItemStatus.CLAIMED.getValue()));
        double lostAvgHours = averageHours(lostItemMapper.selectMaps(
                new QueryWrapper<LostItem>()
                        .select("AVG(TIMESTAMPDIFF(HOUR, created_at, updated_at)) AS avgHours")
                        .isNull("deleted_at")
                        .eq("status", LostItemStatus.FOUND.getValue())));
        double foundAvgHours = averageHours(foundItemMapper.selectMaps(
                new QueryWrapper<FoundItem>()
                        .select("AVG(TIMESTAMPDIFF(HOUR, created_at, updated_at)) AS avgHours")
                        .isNull("deleted_at")
                        .eq("status", FoundItemStatus.CLAIMED.getValue())));
        long resolvedTotal = (resolvedLostCount == null ? 0 : resolvedLostCount)
                + (resolvedFoundCount == null ? 0 : resolvedFoundCount);
        if (resolvedTotal > 0) {
            double weighted = (lostAvgHours * (resolvedLostCount == null ? 0 : resolvedLostCount)
                    + foundAvgHours * (resolvedFoundCount == null ? 0 : resolvedFoundCount)) / resolvedTotal;
            result.put("avgResolveHours", Math.round(weighted * 10.0) / 10.0);
        } else {
            result.put("avgResolveHours", null);
        }

        List<Map<String, Object>> categoryStats = new ArrayList<>();
        List<Category> categories = categoryMapper.selectList(null);
        Map<Long, Long> lostCounts = categoryCounts(lostItemMapper.selectMaps(
                new QueryWrapper<LostItem>()
                        .select("category_id AS categoryId", "COUNT(*) AS itemCount")
                        .isNotNull("category_id")
                        .isNull("deleted_at")
                        .groupBy("category_id")));
        Map<Long, Long> foundCounts = categoryCounts(foundItemMapper.selectMaps(
                new QueryWrapper<FoundItem>()
                        .select("category_id AS categoryId", "COUNT(*) AS itemCount")
                        .isNotNull("category_id")
                        .isNull("deleted_at")
                        .groupBy("category_id")));
        for (Category cat : categories) {
            Map<String, Object> stat = new LinkedHashMap<>();
            stat.put("name", cat.getName());
            stat.put("lostCount", lostCounts.getOrDefault(cat.getId(), 0L));
            stat.put("foundCount", foundCounts.getOrDefault(cat.getId(), 0L));
            categoryStats.add(stat);
        }
        result.put("categoryStats", categoryStats);

        return result;
    }

    private double averageHours(List<Map<String, Object>> rows) {
        if (rows == null || rows.isEmpty()) {
            return 0.0;
        }
        Number value = number(rows.get(0), "avgHours");
        return value == null ? 0.0 : value.doubleValue();
    }

    @Override
    public List<Map<String, Object>> getDailyTrend(int days) {
        LocalDate today = AppTime.today();
        LocalDate start = today.minusDays(days - 1L);
        Map<LocalDate, long[]> counts = new LinkedHashMap<>();
        for (int i = 0; i < days; i++) {
            counts.put(start.plusDays(i), new long[2]);
        }
        fillTrend(lostItemMapper.selectMaps(new QueryWrapper<LostItem>()
                        .select("DATE(created_at) AS day", "COUNT(*) AS cnt")
                        .ge("created_at", start.atStartOfDay())
                        .isNull("deleted_at")
                        .groupBy("DATE(created_at)")),
                counts, 0);
        fillTrend(foundItemMapper.selectMaps(new QueryWrapper<FoundItem>()
                        .select("DATE(created_at) AS day", "COUNT(*) AS cnt")
                        .ge("created_at", start.atStartOfDay())
                        .isNull("deleted_at")
                        .groupBy("DATE(created_at)")),
                counts, 1);

        List<Map<String, Object>> result = new ArrayList<>(days);
        counts.forEach((date, values) -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("date", date.toString());
            row.put("lostCount", values[0]);
            row.put("foundCount", values[1]);
            result.add(row);
        });
        return result;
    }

    private void fillTrend(List<Map<String, Object>> rows,
                           Map<LocalDate, long[]> counts, int index) {
        for (Map<String, Object> row : rows) {
            Object day = row.get("day");
            Number count = number(row, "cnt");
            if (day == null || count == null) {
                continue;
            }
            try {
                LocalDate date = LocalDate.parse(day.toString());
                long[] values = counts.get(date);
                if (values != null) {
                    values[index] = count.longValue();
                }
            } catch (Exception ignored) {
                // 非法日期行忽略
            }
        }
    }

    private Map<Long, Long> categoryCounts(List<Map<String, Object>> rows) {
        Map<Long, Long> result = new HashMap<>();
        for (Map<String, Object> row : rows) {
            Number categoryId = number(row, "categoryId");
            Number count = number(row, "itemCount");
            if (categoryId != null && count != null) {
                result.put(categoryId.longValue(), count.longValue());
            }
        }
        return result;
    }

    private Number number(Map<String, Object> values, String key) {
        Object value = values.get(key);
        if (value == null) value = values.get(key.toLowerCase(Locale.ROOT));
        if (value == null) value = values.get(key.toUpperCase(Locale.ROOT));
        return value instanceof Number number ? number : null;
    }
}
