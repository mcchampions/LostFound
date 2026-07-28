package me.qscbm.projects.lostfound.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import me.qscbm.projects.lostfound.entity.Notification;

public interface NotificationService {
    IPage<Notification> list(Long userId, int page, int size);
    void markRead(Long userId, Long id);
    void markAllRead(Long userId);
    long getUnreadCount(Long userId);
}
