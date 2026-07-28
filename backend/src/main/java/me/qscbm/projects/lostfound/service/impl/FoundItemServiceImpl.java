package me.qscbm.projects.lostfound.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.qscbm.projects.lostfound.common.BusinessException;
import me.qscbm.projects.lostfound.dto.FoundItemRequest;
import me.qscbm.projects.lostfound.dto.FoundItemVO;
import me.qscbm.projects.lostfound.entity.Category;
import me.qscbm.projects.lostfound.entity.FoundItem;
import me.qscbm.projects.lostfound.entity.User;
import me.qscbm.projects.lostfound.entity.enums.ItemStatus;
import me.qscbm.projects.lostfound.mapper.CategoryMapper;
import me.qscbm.projects.lostfound.mapper.FoundItemMapper;
import me.qscbm.projects.lostfound.mapper.UserMapper;
import me.qscbm.projects.lostfound.service.FoundItemService;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class FoundItemServiceImpl implements FoundItemService {

    private final FoundItemMapper foundItemMapper;
    private final UserMapper userMapper;
    private final CategoryMapper categoryMapper;
    private final ObjectMapper objectMapper;

    @Override
    public IPage<FoundItemVO> page(int page, int size, String keyword, Long categoryId, String status) {
        LambdaQueryWrapper<FoundItem> qw = new LambdaQueryWrapper<>();
        if (keyword != null && !keyword.isEmpty()) {
            qw.and(w -> w.like(FoundItem::getTitle, keyword).or().like(FoundItem::getDescription, keyword));
        }
        if (categoryId != null) {
            qw.eq(FoundItem::getCategoryId, categoryId);
        }
        if (status != null && !status.isEmpty()) {
            qw.eq(FoundItem::getStatus, status);
        }
        qw.orderByDesc(FoundItem::getCreatedAt);
        IPage<FoundItem> p = foundItemMapper.selectPage(new Page<>(page, size), qw);
        return p.convert(this::toVO);
    }

    @Override
    public FoundItemVO getById(Long id) {
        FoundItem item = foundItemMapper.selectById(id);
        if (item == null) {
            throw new BusinessException("失物招领不存在");
        }
        return toVO(item);
    }

    @Override
    public FoundItemVO create(Long userId, FoundItemRequest req) {
        FoundItem item = new FoundItem();
        item.setUserId(userId);
        item.setTitle(req.getTitle());
        item.setDescription(req.getDescription());
        item.setCategoryId(req.getCategoryId());
        item.setLocation(req.getLocation());
        item.setFoundTime(req.getFoundTime());
        item.setImageUrls(serializeImageUrls(req.getImageUrls()));
        item.setCoverImage(req.getCoverImage());
        item.setStatus("UNCLAIMED");
        foundItemMapper.insert(item);
        return toVO(item);
    }

    @Override
    public FoundItemVO update(Long id, Long userId, FoundItemRequest req) {
        FoundItem item = foundItemMapper.selectById(id);
        if (item == null) {
            throw new BusinessException("失物招领不存在");
        }
        if (!item.getUserId().equals(userId)) {
            throw new BusinessException("无权修改他人的失物招领");
        }
        if (req.getTitle() != null) {
            item.setTitle(req.getTitle());
        }
        if (req.getDescription() != null) {
            item.setDescription(req.getDescription());
        }
        if (req.getCategoryId() != null) {
            item.setCategoryId(req.getCategoryId());
        }
        if (req.getLocation() != null) {
            item.setLocation(req.getLocation());
        }
        if (req.getFoundTime() != null) {
            item.setFoundTime(req.getFoundTime());
        }
        if (req.getImageUrls() != null) {
            item.setImageUrls(serializeImageUrls(req.getImageUrls()));
        }
        if (req.getCoverImage() != null) {
            item.setCoverImage(req.getCoverImage());
        }
        foundItemMapper.updateById(item);
        return toVO(item);
    }

    @Override
    public void delete(Long id, Long userId) {
        FoundItem item = foundItemMapper.selectById(id);
        if (item == null) {
            throw new BusinessException("失物招领不存在");
        }
        if (!item.getUserId().equals(userId)) {
            throw new BusinessException("无权删除他人的失物招领");
        }
        foundItemMapper.deleteById(id);
    }

    @Override
    public void updateStatus(Long id, Long userId, String status) {
        FoundItem item = foundItemMapper.selectById(id);
        if (item == null) {
            throw new BusinessException("失物招领不存在");
        }
        if (!item.getUserId().equals(userId)) {
            throw new BusinessException("无权修改他人的失物招领状态");
        }
        try {
            ItemStatus.valueOf(status.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException("无效的物品状态");
        }
        item.setStatus(status);
        foundItemMapper.updateById(item);
    }

    @Override
    public void updateStatus(Long id, Long userId, String status, String resolvedType, Long resolvedBy, String resolvedNote) {
        FoundItem item = foundItemMapper.selectById(id);
        if (item == null) throw new BusinessException("失物招领不存在");
        if (!item.getUserId().equals(userId)) throw new BusinessException("无权修改他人的失物招领状态");
        try { ItemStatus.valueOf(status.toUpperCase()); }
        catch (IllegalArgumentException e) { throw new BusinessException("无效的物品状态"); }
        item.setResolvedType(resolvedType);
        item.setResolvedBy(resolvedBy);
        if (resolvedNote != null && !resolvedNote.isBlank()) {
            item.setDescription((item.getDescription() != null ? item.getDescription() + "\n\n" : "") + "[补充说明] " + resolvedNote);
        }
        item.setStatus(status);
        foundItemMapper.updateById(item);
    }

    private FoundItemVO toVO(FoundItem item) {
        String userName = null;
        if (item.getUserId() != null) {
            User user = userMapper.selectById(item.getUserId());
            if (user != null) {
                userName = user.getRealName() != null ? user.getRealName() : user.getUsername();
            }
        }
        String categoryName = null;
        if (item.getCategoryId() != null) {
            Category category = categoryMapper.selectById(item.getCategoryId());
            if (category != null) {
                categoryName = category.getName();
            }
        }
        return FoundItemVO.builder()
                .id(item.getId())
                .userId(item.getUserId())
                .userName(userName)
                .title(item.getTitle())
                .description(item.getDescription())
                .categoryId(item.getCategoryId())
                .categoryName(categoryName)
                .location(item.getLocation())
                .foundTime(item.getFoundTime())
                .imageUrls(deserializeImageUrls(item.getImageUrls()))
                .coverImage(item.getCoverImage())
                .status(item.getStatus())
                .createdAt(item.getCreatedAt())
                .build();
    }

    private String serializeImageUrls(List<String> imageUrls) {
        if (imageUrls == null || imageUrls.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(imageUrls);
        } catch (JsonProcessingException e) {
            throw new BusinessException("图片URL序列化失败");
        }
    }

    private List<String> deserializeImageUrls(String json) {
        if (json == null || json.isEmpty()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (JsonProcessingException e) {
            log.warn("图片URL反序列化失败: {}", json, e);
            return Collections.emptyList();
        }
    }
}
