package me.qscbm.projects.lostfound.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import me.qscbm.projects.lostfound.entity.Announcement;

public interface AnnouncementService {
    IPage<Announcement> list(int page, int size);
    Announcement create(Long publisherId, String title, String content);
    Announcement update(Long id, String title, String content);
    void delete(Long id);
}
