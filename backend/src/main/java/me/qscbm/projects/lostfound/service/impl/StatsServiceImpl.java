package me.qscbm.projects.lostfound.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
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
        for (Category cat : categories) {
            Map<String, Object> stat = new LinkedHashMap<>();
            stat.put("name", cat.getName());
            stat.put("lostCount", lostItemMapper.selectCount(
                    new LambdaQueryWrapper<LostItem>().eq(LostItem::getCategoryId, cat.getId())));
            stat.put("foundCount", foundItemMapper.selectCount(
                    new LambdaQueryWrapper<FoundItem>().eq(FoundItem::getCategoryId, cat.getId())));
            categoryStats.add(stat);
        }
        result.put("categoryStats", categoryStats);

        return result;
    }
}
