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
import me.qscbm.projects.lostfound.entity.ClaimApplication;
import me.qscbm.projects.lostfound.entity.LostItem;
import me.qscbm.projects.lostfound.entity.enums.LostItemStatus;
import me.qscbm.projects.lostfound.mapper.ClaimApplicationMapper;
import me.qscbm.projects.lostfound.mapper.LostItemMapper;
import me.qscbm.projects.lostfound.service.LostItemService;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class LostItemServiceImpl implements LostItemService {

    private final LostItemMapper lostItemMapper;
    private final ClaimApplicationMapper claimApplicationMapper;
    private final ObjectMapper objectMapper;
    private final ItemVOMapper itemVOMapper;
    private final OperationLogRecorder operationLogRecorder;
    private final ImageStorageService imageStorageService;

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
            if (!LostItemStatus.LOST.getValue().equals(status)
                    && !LostItemStatus.FOUND.getValue().equals(status)) {
                throw new BusinessException("无效的失物状态参数，仅支持 LOST 或 FOUND");
            }
            qw.eq(LostItem::getStatus, status);
        }
        qw.orderByDesc(LostItem::getCreatedAt);
        IPage<LostItem> p = lostItemMapper.selectPage(new Page<>(page, size), qw);
        Page<LostItemVO> result = new Page<>(p.getCurrent(), p.getSize(), p.getTotal());
        result.setRecords(itemVOMapper.lostList(p.getRecords()));
        return result;
    }

    @Override
    public LostItemVO getById(Long id) {
        LostItem item = lostItemMapper.selectById(id);
        if (item == null) {
            throw new BusinessException("寻物启事不存在");
        }
        return itemVOMapper.lost(item);
    }

    @Override
    public LostItemVO create(Long userId, LostItemRequest req) {
        imageStorageService.validateOwnedUrls(userId, req.getImageUrls());
        imageStorageService.validateOwnedUrl(userId, req.getCoverImage());
        LostItem item = new LostItem();
        item.setUserId(userId);
        item.setTitle(req.getTitle());
        item.setDescription(req.getDescription());
        item.setCategoryId(req.getCategoryId());
        item.setLocation(req.getLocation());
        item.setLostTime(req.getLostTime());
        item.setLostTimeEnd(req.getLostTimeEnd());
        item.setImageUrls(serializeImageUrls(req.getImageUrls()));
        item.setCoverImage(req.getCoverImage());
        item.setStatus(LostItemStatus.LOST.getValue());
        validateTimeRange(item.getLostTime(), item.getLostTimeEnd());
        lostItemMapper.insert(item);
        log.info("失物发布: userId={} 发布失物 id={} 标题={}", userId, item.getId(), item.getTitle());
        operationLogRecorder.log(userId, "LOST_ITEM_CREATE", "LOST_ITEM", item.getId(),
                "发布失物：" + item.getTitle());
        return itemVOMapper.lost(item);
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
        if (req.getImageUrls() != null) {
            imageStorageService.validateOwnedUrls(userId, req.getImageUrls());
        }
        if (req.getCoverImage() != null) {
            imageStorageService.validateOwnedUrl(userId, req.getCoverImage());
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
        if (req.getLostTime() != null) {
            item.setLostTime(req.getLostTime());
        }
        item.setLostTimeEnd(req.getLostTimeEnd());
        if (req.getImageUrls() != null) {
            item.setImageUrls(serializeImageUrls(req.getImageUrls()));
        }
        if (req.getCoverImage() != null) {
            item.setCoverImage(req.getCoverImage());
        }
        validateTimeRange(item.getLostTime(), item.getLostTimeEnd());
        lostItemMapper.updateById(item);
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
        operationLogRecorder.log(userId, "LOST_ITEM_UPDATE", "LOST_ITEM", id,
                "更新失物：" + item.getTitle());
        return itemVOMapper.lost(item);
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
        LostItem item = lostItemMapper.selectById(id);
        if (item == null) {
            throw new BusinessException("寻物启事不存在");
        }
        if (!item.getUserId().equals(userId)) {
            throw new BusinessException("无权删除他人的寻物启事");
        }
        Long claimCount = claimApplicationMapper.selectCount(
                new LambdaQueryWrapper<ClaimApplication>()
                        .eq(ClaimApplication::getItemType, "LOST")
                        .eq(ClaimApplication::getItemId, id));
        if (claimCount != null && claimCount > 0) {
            throw new BusinessException("该失物已有申请记录，不能删除");
        }
        lostItemMapper.deleteById(id);
        List<String> urls = new java.util.ArrayList<>(deserializeImageUrls(item.getImageUrls()));
        if (item.getCoverImage() != null) {
            urls.add(item.getCoverImage());
        }
        imageStorageService.deleteFiles(urls);
        log.info("失物删除: userId={} 删除失物 id={}", userId, id);
        operationLogRecorder.log(userId, "LOST_ITEM_DELETE", "LOST_ITEM", id,
                "删除失物：" + item.getTitle());
    }

    @Override
    public void updateStatus(Long id, Long userId, String status, String resolvedType, Long resolvedBy, String resolvedNote) {
        LostItem item = lostItemMapper.selectById(id);
        if (item == null) throw new BusinessException("寻物启事不存在");
        if (!item.getUserId().equals(userId)) throw new BusinessException("无权修改他人的寻物启事状态");
        String normalized = status == null ? "" : status.trim().toUpperCase();
        if (!LostItemStatus.LOST.getValue().equals(normalized)
                && !LostItemStatus.FOUND.getValue().equals(normalized)) {
            throw new BusinessException("寻物启事状态仅支持 LOST 或 FOUND");
        }
        if (LostItemStatus.FOUND.getValue().equals(item.getStatus())
                && LostItemStatus.LOST.getValue().equals(normalized)) {
            throw new BusinessException("已找到的失物不能恢复为未找到状态");
        }
        String normalizedResolvedType = resolvedType == null ? null : resolvedType.toUpperCase();
        if (resolvedNote != null && resolvedNote.length() > 1000) {
            throw new BusinessException("补充说明不能超过1000个字符");
        }
        item.setResolvedType(LostItemStatus.FOUND.getValue().equals(normalized) ? normalizedResolvedType : null);
        item.setResolvedBy(LostItemStatus.FOUND.getValue().equals(normalized) ? resolvedBy : null);
        item.setResolvedNote(LostItemStatus.FOUND.getValue().equals(normalized) && resolvedNote != null && !resolvedNote.isBlank()
                ? resolvedNote.trim() : null);
        validateResolution(normalized, item.getResolvedType(), item.getResolvedBy());
        item.setStatus(normalized);
        lostItemMapper.updateById(item);
        if (LostItemStatus.FOUND.getValue().equals(normalized)) {
            List<String> urls = new java.util.ArrayList<>(deserializeImageUrls(item.getImageUrls()));
            if (item.getCoverImage() != null) {
                urls.add(item.getCoverImage());
            }
            imageStorageService.compressItemTo540p(urls);
        }
    }

    private void validateResolution(String status, String resolvedType, Long resolvedBy) {
        if (!LostItemStatus.FOUND.getValue().equals(status)) return;
        if (resolvedType == null || (!"SELF".equals(resolvedType)
                && !"USER".equals(resolvedType) && !"OTHER".equals(resolvedType))) {
            throw new BusinessException("解决方式仅支持 SELF、USER 或 OTHER");
        }
        if ("USER".equals(resolvedType) && resolvedBy == null) {
            throw new BusinessException("请选择解决该失物的站内用户");
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
