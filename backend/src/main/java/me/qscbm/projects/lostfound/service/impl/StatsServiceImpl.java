package me.qscbm.projects.lostfound.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.RequiredArgsConstructor;
import me.qscbm.projects.lostfound.entity.Category;
import me.qscbm.projects.lostfound.entity.FoundItem;
import me.qscbm.projects.lostfound.entity.LostItem;
import me.qscbm.projects.lostfound.entity.User;
import me.qscbm.projects.lostfound.mapper.CategoryMapper;
import me.qscbm.projects.lostfound.mapper.FoundItemMapper;
import me.qscbm.projects.lostfound.mapper.LostItemMapper;
import me.qscbm.projects.lostfound.mapper.UserMapper;
import me.qscbm.projects.lostfound.service.StatsService;
import org.springframework.stereotype.Service;

import java.util.*;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class StatsServiceImpl implements StatsService {

    private final LostItemMapper lostItemMapper;
    private final FoundItemMapper foundItemMapper;
    private final UserMapper userMapper;
    private final CategoryMapper categoryMapper;

    @Override
    public Map<String, Object> getDashboard() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("lostCount", lostItemMapper.selectCount(null));
        result.put("foundCount", foundItemMapper.selectCount(null));
        result.put("claimedCount", foundItemMapper.selectCount(
                new LambdaQueryWrapper<FoundItem>().eq(FoundItem::getStatus, "CLAIMED")));
        result.put("foundLostCount", lostItemMapper.selectCount(
                new LambdaQueryWrapper<LostItem>().eq(LostItem::getStatus, "FOUND")));
        result.put("pendingUserCount", userMapper.selectCount(
                new LambdaQueryWrapper<User>().eq(User::getStatus, "PENDING")));

        List<Map<String, Object>> categoryStats = new ArrayList<>();
        List<Category> categories = categoryMapper.selectList(null);
        Map<Long, Long> lostCounts = categoryCounts(lostItemMapper.selectMaps(
                new QueryWrapper<LostItem>()
                        .select("category_id AS categoryId", "COUNT(*) AS itemCount")
                        .isNotNull("category_id")
                        .groupBy("category_id")));
        Map<Long, Long> foundCounts = categoryCounts(foundItemMapper.selectMaps(
                new QueryWrapper<FoundItem>()
                        .select("category_id AS categoryId", "COUNT(*) AS itemCount")
                        .isNotNull("category_id")
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

    @Override
    public List<Map<String, Object>> getDailyTrend(int days) {
        LocalDate today = LocalDate.now();
        LocalDate start = today.minusDays(days - 1L);
        Map<LocalDate, long[]> counts = new LinkedHashMap<>();
        for (int i = 0; i < days; i++) {
            counts.put(start.plusDays(i), new long[2]);
        }
        fillTrend(lostItemMapper.selectMaps(new QueryWrapper<LostItem>()
                        .select("DATE(created_at) AS day", "COUNT(*) AS cnt")
                        .ge("created_at", start.atStartOfDay())
                        .groupBy("DATE(created_at)")),
                counts, 0);
        fillTrend(foundItemMapper.selectMaps(new QueryWrapper<FoundItem>()
                        .select("DATE(created_at) AS day", "COUNT(*) AS cnt")
                        .ge("created_at", start.atStartOfDay())
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
