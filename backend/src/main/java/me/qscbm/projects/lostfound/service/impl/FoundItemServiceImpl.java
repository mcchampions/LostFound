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
import me.qscbm.projects.lostfound.entity.ClaimApplication;
import me.qscbm.projects.lostfound.entity.FoundItem;
import me.qscbm.projects.lostfound.entity.User;
import me.qscbm.projects.lostfound.entity.enums.ItemStatus;
import me.qscbm.projects.lostfound.mapper.CategoryMapper;
import me.qscbm.projects.lostfound.mapper.ClaimApplicationMapper;
import me.qscbm.projects.lostfound.mapper.FoundItemMapper;
import me.qscbm.projects.lostfound.mapper.UserMapper;
import me.qscbm.projects.lostfound.service.FoundItemService;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FoundItemServiceImpl implements FoundItemService {

    private final FoundItemMapper foundItemMapper;
    private final UserMapper userMapper;
    private final CategoryMapper categoryMapper;
    private final ClaimApplicationMapper claimApplicationMapper;
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
        Page<FoundItemVO> result = new Page<>(p.getCurrent(), p.getSize(), p.getTotal());
        result.setRecords(toVOs(p.getRecords()));
        return result;
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
        item.setFoundTimeEnd(req.getFoundTimeEnd());
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
        if (req.getFoundTimeEnd() != null) {
            item.setFoundTimeEnd(req.getFoundTimeEnd());
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
        Long claimCount = claimApplicationMapper.selectCount(
                new LambdaQueryWrapper<ClaimApplication>()
                        .eq(ClaimApplication::getItemType, "FOUND")
                        .eq(ClaimApplication::getItemId, id));
        if (claimCount != null && claimCount > 0) {
            throw new BusinessException("该招领信息已有申请记录，不能删除");
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
        String normalized = status.toUpperCase();
        if (!"UNCLAIMED".equals(normalized) && !"CLAIMED".equals(normalized)) {
            throw new BusinessException("招领信息状态仅支持 UNCLAIMED 或 CLAIMED");
        }
        item.setStatus(normalized);
        foundItemMapper.updateById(item);
    }

    @Override
    public void updateStatus(Long id, Long userId, String status, String resolvedType, Long resolvedBy, String resolvedNote) {
        FoundItem item = foundItemMapper.selectById(id);
        if (item == null) throw new BusinessException("失物招领不存在");
        if (!item.getUserId().equals(userId)) throw new BusinessException("无权修改他人的失物招领状态");
        String normalized = status.toUpperCase();
        if (!"UNCLAIMED".equals(normalized) && !"CLAIMED".equals(normalized)) {
            throw new BusinessException("招领信息状态仅支持 UNCLAIMED 或 CLAIMED");
        }
        String normalizedResolvedType = resolvedType == null ? null : resolvedType.toUpperCase();
        if (resolvedNote != null && resolvedNote.length() > 1000) {
            throw new BusinessException("补充说明不能超过1000个字符");
        }
        item.setResolvedType("CLAIMED".equals(normalized) ? normalizedResolvedType : null);
        item.setResolvedBy("CLAIMED".equals(normalized) ? resolvedBy : null);
        item.setResolvedNote("CLAIMED".equals(normalized) && resolvedNote != null && !resolvedNote.isBlank()
                ? resolvedNote.trim() : null);
        validateResolution(normalized, item.getResolvedType(), item.getResolvedBy());
        item.setStatus(normalized);
        foundItemMapper.updateById(item);
    }

    private FoundItemVO toVO(FoundItem item) {
        Map<Long, User> users = new HashMap<>();
        if (item.getUserId() != null) {
            User user = userMapper.selectById(item.getUserId());
            if (user != null) users.put(user.getId(), user);
        }
        if (item.getResolvedBy() != null && !Objects.equals(item.getResolvedBy(), item.getUserId())) {
            User resolver = userMapper.selectById(item.getResolvedBy());
            if (resolver != null) users.put(resolver.getId(), resolver);
        }
        Map<Long, Category> categories = new HashMap<>();
        if (item.getCategoryId() != null) {
            Category category = categoryMapper.selectById(item.getCategoryId());
            if (category != null) categories.put(category.getId(), category);
        }
        return toVO(item, users, categories);
    }

    private List<FoundItemVO> toVOs(List<FoundItem> items) {
        Set<Long> userIds = items.stream()
                .flatMap(item -> java.util.stream.Stream.of(item.getUserId(), item.getResolvedBy()))
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Set<Long> categoryIds = items.stream()
                .map(FoundItem::getCategoryId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, User> users = userIds.isEmpty() ? Collections.emptyMap()
                : userMapper.selectBatchIds(userIds).stream()
                .collect(Collectors.toMap(User::getId, user -> user));
        Map<Long, Category> categories = categoryIds.isEmpty() ? Collections.emptyMap()
                : categoryMapper.selectBatchIds(categoryIds).stream()
                .collect(Collectors.toMap(Category::getId, category -> category));
        return items.stream().map(item -> toVO(item, users, categories)).toList();
    }

    private FoundItemVO toVO(FoundItem item, Map<Long, User> users, Map<Long, Category> categories) {
        User publisher = users.get(item.getUserId());
        User resolver = users.get(item.getResolvedBy());
        Category category = categories.get(item.getCategoryId());
        return FoundItemVO.builder()
                .id(item.getId())
                .userId(item.getUserId())
                .userName(displayName(publisher))
                .title(item.getTitle())
                .description(item.getDescription())
                .categoryId(item.getCategoryId())
                .categoryName(category != null ? category.getName() : null)
                .location(item.getLocation())
                .foundTime(item.getFoundTime())
                .foundTimeEnd(item.getFoundTimeEnd())
                .imageUrls(deserializeImageUrls(item.getImageUrls()))
                .coverImage(item.getCoverImage())
                .status(item.getStatus())
                .resolvedBy(item.getResolvedBy())
                .resolvedByName(displayName(resolver))
                .resolvedType(item.getResolvedType())
                .resolvedNote(item.getResolvedNote())
                .createdAt(item.getCreatedAt())
                .build();
    }

    private String displayName(User user) {
        return user == null ? null : user.getRealName() != null ? user.getRealName() : user.getUsername();
    }

    private void validateResolution(String status, String resolvedType, Long resolvedBy) {
        if (!"CLAIMED".equals(status)) return;
        if (resolvedType == null || (!"SELF".equals(resolvedType)
                && !"USER".equals(resolvedType) && !"OTHER".equals(resolvedType))) {
            throw new BusinessException("解决方式仅支持 SELF、USER 或 OTHER");
        }
        if ("USER".equals(resolvedType) && resolvedBy == null) {
            throw new BusinessException("请选择认领该物品的站内用户");
        }
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
