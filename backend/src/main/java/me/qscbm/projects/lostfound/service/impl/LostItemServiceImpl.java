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
import me.qscbm.projects.lostfound.dto.LostItemRequest;
import me.qscbm.projects.lostfound.dto.LostItemVO;
import me.qscbm.projects.lostfound.entity.Category;
import me.qscbm.projects.lostfound.entity.LostItem;
import me.qscbm.projects.lostfound.entity.User;
import me.qscbm.projects.lostfound.entity.enums.ItemStatus;
import me.qscbm.projects.lostfound.mapper.CategoryMapper;
import me.qscbm.projects.lostfound.mapper.LostItemMapper;
import me.qscbm.projects.lostfound.mapper.UserMapper;
import me.qscbm.projects.lostfound.service.LostItemService;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class LostItemServiceImpl implements LostItemService {

    private final LostItemMapper lostItemMapper;
    private final UserMapper userMapper;
    private final CategoryMapper categoryMapper;
    private final ObjectMapper objectMapper;

    @Override
    public IPage<LostItemVO> page(int page, int size, String keyword, Long categoryId, String status) {
        LambdaQueryWrapper<LostItem> qw = new LambdaQueryWrapper<>();
        if (keyword != null && !keyword.isEmpty()) {
            qw.and(w -> w.like(LostItem::getTitle, keyword).or().like(LostItem::getDescription, keyword));
        }
        if (categoryId != null) {
            qw.eq(LostItem::getCategoryId, categoryId);
        }
        if (status != null && !status.isEmpty()) {
            qw.eq(LostItem::getStatus, status);
        }
        qw.orderByDesc(LostItem::getCreatedAt);
        IPage<LostItem> p = lostItemMapper.selectPage(new Page<>(page, size), qw);
        return p.convert(this::toVO);
    }

    @Override
    public LostItemVO getById(Long id) {
        LostItem item = lostItemMapper.selectById(id);
        if (item == null) {
            throw new BusinessException("寻物启事不存在");
        }
        return toVO(item);
    }

    @Override
    public LostItemVO create(Long userId, LostItemRequest req) {
        LostItem item = new LostItem();
        item.setUserId(userId);
        item.setTitle(req.getTitle());
        item.setDescription(req.getDescription());
        item.setCategoryId(req.getCategoryId());
        item.setLocation(req.getLocation());
        item.setLostTime(req.getLostTime());
        item.setImageUrls(serializeImageUrls(req.getImageUrls()));
        item.setCoverImage(req.getCoverImage());
        item.setStatus("LOST");
        lostItemMapper.insert(item);
        return toVO(item);
    }

    @Override
    public LostItemVO update(Long id, Long userId, LostItemRequest req) {
        LostItem item = lostItemMapper.selectById(id);
        if (item == null) {
            throw new BusinessException("寻物启事不存在");
        }
        if (!item.getUserId().equals(userId)) {
            throw new BusinessException("无权修改他人的寻物启事");
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
        if (req.getLostTime() != null) {
            item.setLostTime(req.getLostTime());
        }
        if (req.getImageUrls() != null) {
            item.setImageUrls(serializeImageUrls(req.getImageUrls()));
        }
        if (req.getCoverImage() != null) {
            item.setCoverImage(req.getCoverImage());
        }
        lostItemMapper.updateById(item);
        return toVO(item);
    }

    @Override
    public void delete(Long id, Long userId) {
        LostItem item = lostItemMapper.selectById(id);
        if (item == null) {
            throw new BusinessException("寻物启事不存在");
        }
        if (!item.getUserId().equals(userId)) {
            throw new BusinessException("无权删除他人的寻物启事");
        }
        lostItemMapper.deleteById(id);
    }

    @Override
    public void updateStatus(Long id, Long userId, String status) {
        LostItem item = lostItemMapper.selectById(id);
        if (item == null) {
            throw new BusinessException("寻物启事不存在");
        }
        if (!item.getUserId().equals(userId)) {
            throw new BusinessException("无权修改他人的寻物启事状态");
        }
        String normalized = status.toUpperCase();
        if (!"LOST".equals(normalized) && !"FOUND".equals(normalized)) {
            throw new BusinessException("寻物启事状态仅支持 LOST 或 FOUND");
        }
        item.setStatus(normalized);
        lostItemMapper.updateById(item);
    }

    @Override
    public void updateStatus(Long id, Long userId, String status, String resolvedType, Long resolvedBy, String resolvedNote) {
        LostItem item = lostItemMapper.selectById(id);
        if (item == null) throw new BusinessException("寻物启事不存在");
        if (!item.getUserId().equals(userId)) throw new BusinessException("无权修改他人的寻物启事状态");
        String normalized = status.toUpperCase();
        if (!"LOST".equals(normalized) && !"FOUND".equals(normalized)) {
            throw new BusinessException("寻物启事状态仅支持 LOST 或 FOUND");
        }
        item.setResolvedType(resolvedType);
        item.setResolvedBy(resolvedBy);
        if (resolvedNote != null && !resolvedNote.isBlank()) {
            item.setDescription((item.getDescription() != null ? item.getDescription() + "\n\n" : "") + "[补充说明] " + resolvedNote);
        }
        item.setStatus(normalized);
        lostItemMapper.updateById(item);
    }

    private LostItemVO toVO(LostItem item) {
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
        return LostItemVO.builder()
                .id(item.getId())
                .userId(item.getUserId())
                .userName(userName)
                .title(item.getTitle())
                .description(item.getDescription())
                .categoryId(item.getCategoryId())
                .categoryName(categoryName)
                .location(item.getLocation())
                .lostTime(item.getLostTime())
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
