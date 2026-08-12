package me.qscbm.projects.lostfound.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.qscbm.projects.lostfound.common.BusinessException;
import me.qscbm.projects.lostfound.dto.AnnouncementRequest;
import me.qscbm.projects.lostfound.entity.Announcement;
import me.qscbm.projects.lostfound.mapper.AnnouncementMapper;
import me.qscbm.projects.lostfound.service.AnnouncementService;
import me.qscbm.projects.lostfound.service.MailNotificationService;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AnnouncementServiceImpl implements AnnouncementService {

    private final AnnouncementMapper announcementMapper;
    private final MailNotificationService mailNotificationService;
    private final OperationLogRecorder operationLogRecorder;

    @Override
    public IPage<Announcement> list(int page, int size) {
        LambdaQueryWrapper<Announcement> qw = new LambdaQueryWrapper<>();
        qw.eq(Announcement::getIsActive, true)
                .orderByDesc(Announcement::getIsPinned)
                .orderByDesc(Announcement::getCreatedAt);
        return announcementMapper.selectPage(new Page<>(page, size), qw);
    }

    @Override
    public IPage<Announcement> adminList(int page, int size) {
        LambdaQueryWrapper<Announcement> qw = new LambdaQueryWrapper<>();
        qw.orderByDesc(Announcement::getIsPinned)
                .orderByDesc(Announcement::getCreatedAt);
        return announcementMapper.selectPage(new Page<>(page, size), qw);
    }

    @Override
    public Announcement create(Long publisherId, AnnouncementRequest req) {
        Announcement announcement = new Announcement();
        announcement.setPublisherId(publisherId);
        announcement.setTitle(req.getTitle());
        announcement.setContent(req.getContent());
        announcement.setIsPinned(Boolean.TRUE.equals(req.getIsPinned()));
        announcement.setIsActive(req.getIsActive() == null || req.getIsActive());
        announcementMapper.insert(announcement);
        mailNotificationService.notifyAnnouncementAfterCommit(req.getTitle(), req.getContent());
        log.info("公告发布: userId={} 公告 id={} 标题={}", publisherId, announcement.getId(), req.getTitle());
        operationLogRecorder.log(publisherId, "ANNOUNCEMENT_CREATE", "ANNOUNCEMENT",
                announcement.getId(), "发布公告：" + req.getTitle());
        return announcement;
    }

    @Override
    public Announcement update(Long id, Long operatorId, AnnouncementRequest req) {
        Announcement announcement = announcementMapper.selectById(id);
        if (announcement == null) {
            throw new BusinessException("公告不存在");
        }
        if (req.getTitle() != null) announcement.setTitle(req.getTitle());
        if (req.getContent() != null) announcement.setContent(req.getContent());
        if (req.getIsPinned() != null) announcement.setIsPinned(req.getIsPinned());
        if (req.getIsActive() != null) announcement.setIsActive(req.getIsActive());
        announcementMapper.updateById(announcement);
        operationLogRecorder.log(operatorId, "ANNOUNCEMENT_UPDATE", "ANNOUNCEMENT", id,
                "更新公告：" + announcement.getTitle());
        return announcement;
    }

    @Override
    public void delete(Long id, Long operatorId) {
        Announcement announcement = announcementMapper.selectById(id);
        if (announcement == null) {
            throw new BusinessException("公告不存在");
        }
        announcementMapper.deleteById(id);
        log.info("公告删除: userId={} 公告 id={}", operatorId, id);
        operationLogRecorder.log(operatorId, "ANNOUNCEMENT_DELETE", "ANNOUNCEMENT", id,
                "删除公告：" + announcement.getTitle());
    }
}
