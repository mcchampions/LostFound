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
import me.qscbm.projects.lostfound.entity.ClaimApplication;
import me.qscbm.projects.lostfound.entity.FoundItem;
import me.qscbm.projects.lostfound.entity.enums.FoundItemStatus;
import me.qscbm.projects.lostfound.mapper.ClaimApplicationMapper;
import me.qscbm.projects.lostfound.mapper.FoundItemMapper;
import me.qscbm.projects.lostfound.service.FoundItemService;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class FoundItemServiceImpl implements FoundItemService {

    private final FoundItemMapper foundItemMapper;
    private final ClaimApplicationMapper claimApplicationMapper;
    private final ObjectMapper objectMapper;
    private final ItemVOMapper itemVOMapper;
    private final OperationLogRecorder operationLogRecorder;
    private final ImageStorageService imageStorageService;

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
            if (!FoundItemStatus.UNCLAIMED.getValue().equals(status)
                    && !FoundItemStatus.CLAIMED.getValue().equals(status)) {
                throw new BusinessException("无效的招领状态参数，仅支持 UNCLAIMED 或 CLAIMED");
            }
            qw.eq(FoundItem::getStatus, status);
        }
        qw.orderByDesc(FoundItem::getCreatedAt);
        IPage<FoundItem> p = foundItemMapper.selectPage(new Page<>(page, size), qw);
        Page<FoundItemVO> result = new Page<>(p.getCurrent(), p.getSize(), p.getTotal());
        result.setRecords(itemVOMapper.foundList(p.getRecords()));
        return result;
    }

    @Override
    public FoundItemVO getById(Long id) {
        FoundItem item = foundItemMapper.selectById(id);
        if (item == null) {
            throw new BusinessException("失物招领不存在");
        }
        return itemVOMapper.found(item);
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
        item.setStatus(FoundItemStatus.UNCLAIMED.getValue());
        validateTimeRange(item.getFoundTime(), item.getFoundTimeEnd());
        foundItemMapper.insert(item);
        log.info("招领发布: userId={} 发布招领 id={} 标题={}", userId, item.getId(), item.getTitle());
        operationLogRecorder.log(userId, "FOUND_ITEM_CREATE", "FOUND_ITEM", item.getId(),
                "发布招领：" + item.getTitle());
        return itemVOMapper.found(item);
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
        List<String> oldImageUrls = deserializeImageUrls(item.getImageUrls());
        String oldCover = item.getCoverImage();
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
        item.setFoundTimeEnd(req.getFoundTimeEnd());
        if (req.getImageUrls() != null) {
            item.setImageUrls(serializeImageUrls(req.getImageUrls()));
        }
        if (req.getCoverImage() != null) {
            item.setCoverImage(req.getCoverImage());
        }
        validateTimeRange(item.getFoundTime(), item.getFoundTimeEnd());
        foundItemMapper.updateById(item);
        // 删除被替换掉的旧图片文件
        List<String> removed = new java.util.ArrayList<>(oldImageUrls);
        if (oldCover != null) {
            removed.add(oldCover);
        }
        removed.removeAll(deserializeImageUrls(item.getImageUrls()));
        if (item.getCoverImage() != null) {
            removed.remove(item.getCoverImage());
        }
        imageStorageService.deleteFiles(removed);
        operationLogRecorder.log(userId, "FOUND_ITEM_UPDATE", "FOUND_ITEM", id,
                "更新招领：" + item.getTitle());
        return itemVOMapper.found(item);
    }

    private void validateTimeRange(LocalDateTime start, LocalDateTime end) {
        if (start != null && end != null && end.isBefore(start)) {
            throw new BusinessException("结束时间不能早于开始时间");
        }
        // 不能选择未来的时间；容忍 2 分钟，避免客户端与服务端时钟轻微偏差误伤
        LocalDateTime maxAllowed = LocalDateTime.now().plusMinutes(2);
        if (start != null && start.isAfter(maxAllowed)) {
            throw new BusinessException("时间不能晚于当前时间");
        }
        if (end != null && end.isAfter(maxAllowed)) {
            throw new BusinessException("时间不能晚于当前时间");
        }
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
        List<String> urls = new java.util.ArrayList<>(deserializeImageUrls(item.getImageUrls()));
        if (item.getCoverImage() != null) {
            urls.add(item.getCoverImage());
        }
        imageStorageService.deleteFiles(urls);
        log.info("招领删除: userId={} 删除招领 id={}", userId, id);
        operationLogRecorder.log(userId, "FOUND_ITEM_DELETE", "FOUND_ITEM", id,
                "删除招领：" + item.getTitle());
    }

    @Override
    public void updateStatus(Long id, Long userId, String status, String resolvedType, Long resolvedBy, String resolvedNote) {
        FoundItem item = foundItemMapper.selectById(id);
        if (item == null) throw new BusinessException("失物招领不存在");
        if (!item.getUserId().equals(userId)) throw new BusinessException("无权修改他人的失物招领状态");
        String normalized = status.toUpperCase();
        if (!FoundItemStatus.UNCLAIMED.getValue().equals(normalized)
                && !FoundItemStatus.CLAIMED.getValue().equals(normalized)) {
            throw new BusinessException("招领信息状态仅支持 UNCLAIMED 或 CLAIMED");
        }
        String normalizedResolvedType = resolvedType == null ? null : resolvedType.toUpperCase();
        if (resolvedNote != null && resolvedNote.length() > 1000) {
            throw new BusinessException("补充说明不能超过1000个字符");
        }
        item.setResolvedType(FoundItemStatus.CLAIMED.getValue().equals(normalized) ? normalizedResolvedType : null);
        item.setResolvedBy(FoundItemStatus.CLAIMED.getValue().equals(normalized) ? resolvedBy : null);
        item.setResolvedNote(FoundItemStatus.CLAIMED.getValue().equals(normalized) && resolvedNote != null && !resolvedNote.isBlank()
                ? resolvedNote.trim() : null);
        validateResolution(normalized, item.getResolvedType(), item.getResolvedBy());
        item.setStatus(normalized);
        foundItemMapper.updateById(item);
        if (FoundItemStatus.CLAIMED.getValue().equals(normalized)) {
            List<String> urls = new java.util.ArrayList<>(deserializeImageUrls(item.getImageUrls()));
            if (item.getCoverImage() != null) {
                urls.add(item.getCoverImage());
            }
            imageStorageService.compressItemTo540p(urls);
        }
    }

    private void validateResolution(String status, String resolvedType, Long resolvedBy) {
        if (!FoundItemStatus.CLAIMED.getValue().equals(status)) return;
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
