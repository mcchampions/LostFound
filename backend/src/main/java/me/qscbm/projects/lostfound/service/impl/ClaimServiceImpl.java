package me.qscbm.projects.lostfound.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.UpdateWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import me.qscbm.projects.lostfound.common.BusinessException;
import me.qscbm.projects.lostfound.dto.ClaimRequest;
import me.qscbm.projects.lostfound.dto.ClaimVO;
import me.qscbm.projects.lostfound.entity.ClaimApplication;
import me.qscbm.projects.lostfound.entity.FoundItem;
import me.qscbm.projects.lostfound.entity.LostItem;
import me.qscbm.projects.lostfound.entity.Notification;
import me.qscbm.projects.lostfound.entity.User;
import me.qscbm.projects.lostfound.mapper.ClaimApplicationMapper;
import me.qscbm.projects.lostfound.mapper.FoundItemMapper;
import me.qscbm.projects.lostfound.mapper.LostItemMapper;
import me.qscbm.projects.lostfound.mapper.NotificationMapper;
import me.qscbm.projects.lostfound.mapper.UserMapper;
import me.qscbm.projects.lostfound.service.ClaimService;
import me.qscbm.projects.lostfound.service.MessageService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.dao.DuplicateKeyException;

import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;
@Service
@RequiredArgsConstructor
public class ClaimServiceImpl implements ClaimService {

    private final ClaimApplicationMapper claimApplicationMapper;
    private final LostItemMapper lostItemMapper;
    private final FoundItemMapper foundItemMapper;
    private final UserMapper userMapper;
    private final NotificationMapper notificationMapper;
    private final MessageService messageService;

    @Override
    @Transactional
    public ClaimVO apply(Long applicantId, ClaimRequest req) {
        // Prevent duplicate claims for the same item
        Long count = claimApplicationMapper.selectCount(
                new LambdaQueryWrapper<ClaimApplication>()
                        .eq(ClaimApplication::getApplicantId, applicantId)
                        .eq(ClaimApplication::getItemType, req.getItemType().toUpperCase())
                        .eq(ClaimApplication::getItemId, req.getItemId())
                        .eq(ClaimApplication::getStatus, "PENDING"));
        if (count != null && count > 0) {
            throw new BusinessException("你已经对该物品提交过认领申请，请等待处理");
        }

        Long publisherId;
        String itemTitle;

        if ("LOST".equalsIgnoreCase(req.getItemType())) {
            LostItem item = lostItemMapper.selectById(req.getItemId());
            if (item == null) {
                throw new BusinessException("寻物启事不存在");
            }
            if (!"LOST".equals(item.getStatus())) {
                throw new BusinessException("该物品已被标记为已找到，无法申请认领");
            }
            publisherId = item.getUserId();
            itemTitle = item.getTitle();
        } else if ("FOUND".equalsIgnoreCase(req.getItemType())) {
            FoundItem item = foundItemMapper.selectById(req.getItemId());
            if (item == null) {
                throw new BusinessException("失物招领不存在");
            }
            if (!"UNCLAIMED".equals(item.getStatus())) {
                throw new BusinessException("该物品已被认领，无法重复申请");
            }
            publisherId = item.getUserId();
            itemTitle = item.getTitle();
        } else {
            throw new BusinessException("无效的物品类型，必须是 LOST 或 FOUND");
        }

        if (publisherId.equals(applicantId)) {
            throw new BusinessException("不能认领自己发布的物品");
        }

        ClaimApplication claim = new ClaimApplication();
        claim.setItemType(req.getItemType().toUpperCase());
        claim.setItemId(req.getItemId());
        claim.setApplicantId(applicantId);
        claim.setPublisherId(publisherId);
        claim.setMessage(req.getMessage());
        claim.setImageUrls(req.getImageUrls());
        claim.setStatus("PENDING");
        try {
            claimApplicationMapper.insert(claim);
        } catch (DuplicateKeyException e) {
            throw new BusinessException("你已经对该物品提交过待处理申请");
        }

        // Create notification for the publisher
        String applicantName = getUserName(applicantId);
        Notification notification = new Notification();
        notification.setUserId(publisherId);
        notification.setType("CLAIM");
        notification.setRelatedId(claim.getId());
        notification.setRelatedType("CLAIM_APPLICATION");
        notification.setIsRead(0);
        if ("LOST".equalsIgnoreCase(req.getItemType())) {
            notification.setTitle("有人找到了你丢失的物品");
            notification.setContent(applicantName + " 联系你表示找到了你丢失的物品「" + itemTitle + "」"
                    + (req.getMessage() != null ? "，留言：" + req.getMessage() : "，请尽快确认。"));
        } else {
            notification.setTitle("新的认领申请");
            notification.setContent(applicantName + " 申请认领你的物品「" + itemTitle + "」"
                    + (req.getMessage() != null ? "，留言：" + req.getMessage() : ""));
        }
        notificationMapper.insert(notification);

        return toVO(claim);
    }

    @Override
    public IPage<ClaimVO> received(Long userId, int page, int size, String status) {
        LambdaQueryWrapper<ClaimApplication> qw = new LambdaQueryWrapper<>();
        qw.eq(ClaimApplication::getPublisherId, userId);
        if (status != null && !status.isEmpty()) {
            qw.eq(ClaimApplication::getStatus, status);
        }
        qw.orderByDesc(ClaimApplication::getCreatedAt);
        IPage<ClaimApplication> p = claimApplicationMapper.selectPage(new Page<>(page, size), qw);
        Page<ClaimVO> result = new Page<>(p.getCurrent(), p.getSize(), p.getTotal());
        result.setRecords(toVOs(p.getRecords()));
        return result;
    }

    @Override
    public IPage<ClaimVO> sent(Long userId, int page, int size, String status) {
        LambdaQueryWrapper<ClaimApplication> qw = new LambdaQueryWrapper<>();
        qw.eq(ClaimApplication::getApplicantId, userId);
        if (status != null && !status.isEmpty()) {
            qw.eq(ClaimApplication::getStatus, status);
        }
        qw.orderByDesc(ClaimApplication::getCreatedAt);
        IPage<ClaimApplication> p = claimApplicationMapper.selectPage(new Page<>(page, size), qw);
        Page<ClaimVO> result = new Page<>(p.getCurrent(), p.getSize(), p.getTotal());
        result.setRecords(toVOs(p.getRecords()));
        return result;
    }

    @Override
    @Transactional
    public void process(Long id, Long userId, String status) {
        ClaimApplication claim = claimApplicationMapper.selectById(id);
        if (claim == null) {
            throw new BusinessException("认领申请不存在");
        }
        if (!claim.getPublisherId().equals(userId)) {
            throw new BusinessException("无权处理该认领申请");
        }
        // Validate status input
        if (status == null || (!"APPROVED".equals(status) && !"REJECTED".equals(status))) {
            throw new BusinessException("无效的处理状态，仅支持 APPROVED 或 REJECTED");
        }
        // Validate state transition: only allow processing PENDING claims
        if (!"PENDING".equals(claim.getStatus())) {
            throw new BusinessException("该认领申请已被处理");
        }

        int updated = claimApplicationMapper.update(null,
                new UpdateWrapper<ClaimApplication>()
                        .eq("id", id)
                        .eq("publisher_id", userId)
                        .eq("status", "PENDING")
                        .set("status", status));
        if (updated != 1) {
            throw new BusinessException("该认领申请已被处理，请刷新后重试");
        }
        claim.setStatus(status);

        // If approved, update item status
        if ("APPROVED".equals(status)) {
            if ("LOST".equals(claim.getItemType())) {
                LostItem lostItem = lostItemMapper.selectById(claim.getItemId());
                if (lostItem == null) {
                    throw new BusinessException("寻物启事不存在");
                }
                int itemUpdated = lostItemMapper.update(null,
                        new UpdateWrapper<LostItem>()
                                .eq("id", claim.getItemId())
                                .eq("status", "LOST")
                                .set("status", "FOUND")
                                .set("resolved_type", "USER")
                                .set("resolved_by", claim.getApplicantId())
                                .set("resolved_note", "通过找到线索申请解决"));
                if (itemUpdated != 1) {
                    throw new BusinessException("该失物已被其他申请处理，请刷新后重试");
                }
            } else if ("FOUND".equals(claim.getItemType())) {
                FoundItem foundItem = foundItemMapper.selectById(claim.getItemId());
                if (foundItem == null) {
                    throw new BusinessException("失物招领不存在");
                }
                int itemUpdated = foundItemMapper.update(null,
                        new UpdateWrapper<FoundItem>()
                                .eq("id", claim.getItemId())
                                .eq("status", "UNCLAIMED")
                                .set("status", "CLAIMED")
                                .set("resolved_type", "USER")
                                .set("resolved_by", claim.getApplicantId())
                                .set("resolved_note", "通过认领申请归还"));
                if (itemUpdated != 1) {
                    throw new BusinessException("该物品已被其他申请认领，请刷新后重试");
                }
            }
            // 级联拒绝同物品的其他待处理申请，保证数据一致
            claimApplicationMapper.update(null, new UpdateWrapper<ClaimApplication>()
                    .set("status", "REJECTED")
                    .eq("item_type", claim.getItemType())
                    .eq("item_id", claim.getItemId())
                    .eq("status", "PENDING")
                    .ne("id", claim.getId()));
            // Auto-create conversation
            String convId = "claim_" + claim.getId();
            messageService.systemMessage(convId, userId, claim.getApplicantId(),
                    "认领申请已通过，现在可以开始对话了。");
        }

        // Notify applicant of the result
        boolean approved = "APPROVED".equals(status);
        String statusText = approved ? "已通过" : "已拒绝";
        String publisherName = getUserName(userId);
        String itemTitle = getItemTitle(claim.getItemType(), claim.getItemId());
        boolean lostItemClaim = "LOST".equals(claim.getItemType());
        String actionName = lostItemClaim ? "找到线索" : "认领申请";
        Notification notification = new Notification();
        notification.setUserId(claim.getApplicantId());
        notification.setTitle(actionName + statusText);
        notification.setContent(lostItemClaim
                ? "你为失物「" + itemTitle + "」提交的找到线索已被" + publisherName + (approved ? "通过" : "拒绝")
                : "你对招领物品「" + itemTitle + "」提交的认领申请已被" + publisherName + (approved ? "通过" : "拒绝"));
        notification.setType("CLAIM_RESULT");
        notification.setRelatedId(claim.getItemId());
        notification.setRelatedType(lostItemClaim ? "LOST_ITEM" : "FOUND_ITEM");
        notification.setIsRead(0);
        notificationMapper.insert(notification);
    }

    private ClaimVO toVO(ClaimApplication claim) {
        Map<Long, User> users = new HashMap<>();
        for (Long userId : List.of(claim.getApplicantId(), claim.getPublisherId())) {
            if (userId == null || users.containsKey(userId)) continue;
            User user = userMapper.selectById(userId);
            if (user != null) users.put(userId, user);
        }
        Map<Long, LostItem> lostItems = new HashMap<>();
        Map<Long, FoundItem> foundItems = new HashMap<>();
        if ("LOST".equals(claim.getItemType())) {
            LostItem item = lostItemMapper.selectById(claim.getItemId());
            if (item != null) lostItems.put(item.getId(), item);
        } else if ("FOUND".equals(claim.getItemType())) {
            FoundItem item = foundItemMapper.selectById(claim.getItemId());
            if (item != null) foundItems.put(item.getId(), item);
        }
        return toVO(claim, users, lostItems, foundItems);
    }

    private List<ClaimVO> toVOs(List<ClaimApplication> claims) {
        Set<Long> userIds = claims.stream()
                .flatMap(claim -> java.util.stream.Stream.of(claim.getApplicantId(), claim.getPublisherId()))
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Set<Long> lostItemIds = claims.stream()
                .filter(claim -> "LOST".equals(claim.getItemType()))
                .map(ClaimApplication::getItemId)
                .collect(Collectors.toSet());
        Set<Long> foundItemIds = claims.stream()
                .filter(claim -> "FOUND".equals(claim.getItemType()))
                .map(ClaimApplication::getItemId)
                .collect(Collectors.toSet());
        Map<Long, User> users = userIds.isEmpty() ? Collections.emptyMap()
                : userMapper.selectBatchIds(userIds).stream()
                .collect(Collectors.toMap(User::getId, user -> user));
        Map<Long, LostItem> lostItems = lostItemIds.isEmpty() ? Collections.emptyMap()
                : lostItemMapper.selectBatchIds(lostItemIds).stream()
                .collect(Collectors.toMap(LostItem::getId, item -> item));
        Map<Long, FoundItem> foundItems = foundItemIds.isEmpty() ? Collections.emptyMap()
                : foundItemMapper.selectBatchIds(foundItemIds).stream()
                .collect(Collectors.toMap(FoundItem::getId, item -> item));
        return claims.stream().map(claim -> toVO(claim, users, lostItems, foundItems)).toList();
    }

    private ClaimVO toVO(
            ClaimApplication claim,
            Map<Long, User> users,
            Map<Long, LostItem> lostItems,
            Map<Long, FoundItem> foundItems) {
        User applicant = users.get(claim.getApplicantId());
        User publisher = users.get(claim.getPublisherId());
        String itemTitle = "LOST".equals(claim.getItemType())
                ? titleOf(lostItems.get(claim.getItemId()))
                : titleOf(foundItems.get(claim.getItemId()));
        return ClaimVO.builder()
                .id(claim.getId())
                .itemType(claim.getItemType())
                .itemId(claim.getItemId())
                .itemTitle(itemTitle)
                .applicantId(claim.getApplicantId())
                .applicantName(displayName(applicant))
                .publisherId(claim.getPublisherId())
                .publisherName(displayName(publisher))
                .message(claim.getMessage())
                .imageUrls(claim.getImageUrls())
                .status(claim.getStatus())
                .createdAt(claim.getCreatedAt())
                .build();
    }

    private String titleOf(LostItem item) {
        return item == null ? null : item.getTitle();
    }

    private String titleOf(FoundItem item) {
        return item == null ? null : item.getTitle();
    }

    private String displayName(User user) {
        return user == null ? null : user.getRealName() != null ? user.getRealName() : user.getUsername();
    }

    private String getUserName(Long userId) {
        if (userId == null) {
            return null;
        }
        User user = userMapper.selectById(userId);
        if (user == null) {
            return null;
        }
        return user.getRealName() != null ? user.getRealName() : user.getUsername();
    }

    private String getItemTitle(String itemType, Long itemId) {
        if ("LOST".equals(itemType)) {
            LostItem item = lostItemMapper.selectById(itemId);
            return item != null ? item.getTitle() : null;
        } else if ("FOUND".equals(itemType)) {
            FoundItem item = foundItemMapper.selectById(itemId);
            return item != null ? item.getTitle() : null;
        }
        return null;
    }
}
