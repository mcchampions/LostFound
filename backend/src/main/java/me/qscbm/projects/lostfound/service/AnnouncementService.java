package me.qscbm.projects.lostfound.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import me.qscbm.projects.lostfound.dto.AnnouncementRequest;
import me.qscbm.projects.lostfound.entity.Announcement;

public interface AnnouncementService {
    IPage<Announcement> list(int page, int size);
    IPage<Announcement> adminList(int page, int size);
    Announcement create(Long publisherId, AnnouncementRequest req);
    Announcement update(Long id, Long operatorId, AnnouncementRequest req);
    void delete(Long id, Long operatorId);
}
