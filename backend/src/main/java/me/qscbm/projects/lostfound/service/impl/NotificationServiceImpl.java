package me.qscbm.projects.lostfound.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.conditions.update.LambdaUpdateWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import me.qscbm.projects.lostfound.common.BusinessException;
import me.qscbm.projects.lostfound.entity.Notification;
import me.qscbm.projects.lostfound.mapper.NotificationMapper;
import me.qscbm.projects.lostfound.service.NotificationService;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationMapper notificationMapper;

    @Override
    public IPage<Notification> list(Long userId, int page, int size) {
        LambdaQueryWrapper<Notification> qw = new LambdaQueryWrapper<>();
        qw.eq(Notification::getUserId, userId)
          .orderByDesc(Notification::getCreatedAt);
        return notificationMapper.selectPage(new Page<>(page, size), qw);
    }

    @Override
    public void markRead(Long userId, Long id) {
        Notification notification = notificationMapper.selectById(id);
        if (notification == null) {
            throw new BusinessException("通知不存在");
        }
        if (!notification.getUserId().equals(userId)) {
            throw new BusinessException("无权操作他人的通知");
        }
        notification.setIsRead(true);
        notificationMapper.updateById(notification);
    }

    @Override
    public void markAllRead(Long userId) {
        LambdaUpdateWrapper<Notification> uw = new LambdaUpdateWrapper<>();
        uw.eq(Notification::getUserId, userId)
          .eq(Notification::getIsRead, false)
          .set(Notification::getIsRead, true);
        notificationMapper.update(uw);
    }

    @Override
    public long getUnreadCount(Long userId) {
        LambdaQueryWrapper<Notification> qw = new LambdaQueryWrapper<>();
        qw.eq(Notification::getUserId, userId)
          .eq(Notification::getIsRead, false);
        return notificationMapper.selectCount(qw);
    }
}
