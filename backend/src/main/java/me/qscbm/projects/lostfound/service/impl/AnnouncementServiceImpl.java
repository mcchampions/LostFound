package me.qscbm.projects.lostfound.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import lombok.RequiredArgsConstructor;
import me.qscbm.projects.lostfound.common.BusinessException;
import me.qscbm.projects.lostfound.entity.Announcement;
import me.qscbm.projects.lostfound.mapper.AnnouncementMapper;
import me.qscbm.projects.lostfound.service.AnnouncementService;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AnnouncementServiceImpl implements AnnouncementService {

    private final AnnouncementMapper announcementMapper;

    @Override
    public IPage<Announcement> list(int page, int size) {
        LambdaQueryWrapper<Announcement> qw = new LambdaQueryWrapper<>();
        qw.orderByDesc(Announcement::getCreatedAt);
        return announcementMapper.selectPage(new Page<>(page, size), qw);
    }

    @Override
    public Announcement create(Long publisherId, String title, String content) {
        Announcement announcement = new Announcement();
        announcement.setPublisherId(publisherId);
        announcement.setTitle(title);
        announcement.setContent(content);
        announcementMapper.insert(announcement);
        return announcement;
    }

    @Override
    public Announcement update(Long id, String title, String content) {
        Announcement announcement = announcementMapper.selectById(id);
        if (announcement == null) {
            throw new BusinessException("公告不存在");
        }
        if (title != null) announcement.setTitle(title);
        if (content != null) announcement.setContent(content);
        announcementMapper.updateById(announcement);
        return announcement;
    }

    @Override
    public void delete(Long id) {
        Announcement announcement = announcementMapper.selectById(id);
        if (announcement == null) {
            throw new BusinessException("公告不存在");
        }
        announcementMapper.deleteById(id);
    }
}
