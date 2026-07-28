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
