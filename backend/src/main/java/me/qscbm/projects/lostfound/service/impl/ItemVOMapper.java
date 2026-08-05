package me.qscbm.projects.lostfound.service.impl;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import me.qscbm.projects.lostfound.dto.FoundItemVO;
import me.qscbm.projects.lostfound.dto.LostItemVO;
import me.qscbm.projects.lostfound.entity.Category;
import me.qscbm.projects.lostfound.entity.FoundItem;
import me.qscbm.projects.lostfound.entity.LostItem;
import me.qscbm.projects.lostfound.entity.User;
import me.qscbm.projects.lostfound.mapper.CategoryMapper;
import me.qscbm.projects.lostfound.mapper.UserMapper;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class ItemVOMapper {

    private final UserMapper userMapper;
    private final CategoryMapper categoryMapper;
    private final ObjectMapper objectMapper;

    public LostItemVO lost(LostItem item) {
        return lostList(List.of(item)).get(0);
    }

    public List<LostItemVO> lostList(List<LostItem> items) {
        Set<Long> userIds = items.stream()
                .flatMap(item -> java.util.stream.Stream.of(item.getUserId(), item.getResolvedBy()))
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Set<Long> categoryIds = items.stream().map(LostItem::getCategoryId)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, User> users = loadUsers(userIds);
        Map<Long, Category> categories = loadCategories(categoryIds);
        return items.stream().map(item -> LostItemVO.builder()
                .id(item.getId()).userId(item.getUserId())
                .userName(displayName(users.get(item.getUserId())))
                .title(item.getTitle()).description(item.getDescription())
                .categoryId(item.getCategoryId())
                .categoryName(name(categories.get(item.getCategoryId())))
                .location(item.getLocation()).lostTime(item.getLostTime())
                .lostTimeEnd(item.getLostTimeEnd()).imageUrls(images(item.getImageUrls()))
                .coverImage(item.getCoverImage()).status(item.getStatus())
                .resolvedBy(item.getResolvedBy())
                .resolvedByName(displayName(users.get(item.getResolvedBy())))
                .resolvedType(item.getResolvedType()).resolvedNote(item.getResolvedNote())
                .createdAt(item.getCreatedAt()).build()).toList();
    }

    public FoundItemVO found(FoundItem item) {
        return foundList(List.of(item)).get(0);
    }

    public List<FoundItemVO> foundList(List<FoundItem> items) {
        Set<Long> userIds = items.stream()
                .flatMap(item -> java.util.stream.Stream.of(item.getUserId(), item.getResolvedBy()))
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Set<Long> categoryIds = items.stream().map(FoundItem::getCategoryId)
                .filter(Objects::nonNull).collect(Collectors.toSet());
        Map<Long, User> users = loadUsers(userIds);
        Map<Long, Category> categories = loadCategories(categoryIds);
        return items.stream().map(item -> FoundItemVO.builder()
                .id(item.getId()).userId(item.getUserId())
                .userName(displayName(users.get(item.getUserId())))
                .title(item.getTitle()).description(item.getDescription())
                .categoryId(item.getCategoryId())
                .categoryName(name(categories.get(item.getCategoryId())))
                .location(item.getLocation()).foundTime(item.getFoundTime())
                .foundTimeEnd(item.getFoundTimeEnd()).imageUrls(images(item.getImageUrls()))
                .coverImage(item.getCoverImage()).status(item.getStatus())
                .resolvedBy(item.getResolvedBy())
                .resolvedByName(displayName(users.get(item.getResolvedBy())))
                .resolvedType(item.getResolvedType()).resolvedNote(item.getResolvedNote())
                .createdAt(item.getCreatedAt()).build()).toList();
    }

    private Map<Long, User> loadUsers(Set<Long> ids) {
        return ids.isEmpty() ? Collections.emptyMap() : userMapper.selectBatchIds(ids).stream()
                .collect(Collectors.toMap(User::getId, user -> user));
    }

    private Map<Long, Category> loadCategories(Set<Long> ids) {
        return ids.isEmpty() ? Collections.emptyMap() : categoryMapper.selectBatchIds(ids).stream()
                .collect(Collectors.toMap(Category::getId, category -> category));
    }

    private String displayName(User user) {
        return user == null ? null : user.getRealName() != null ? user.getRealName() : user.getUsername();
    }

    private String name(Category category) {
        return category == null ? null : category.getName();
    }

    private List<String> images(String json) {
        if (json == null || json.isEmpty()) return Collections.emptyList();
        try {
            return objectMapper.readValue(json, new TypeReference<List<String>>() {});
        } catch (JsonProcessingException ignored) {
            return Collections.emptyList();
        }
    }
}
