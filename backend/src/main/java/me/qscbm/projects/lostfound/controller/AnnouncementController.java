package me.qscbm.projects.lostfound.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import me.qscbm.projects.lostfound.common.PageResult;
import me.qscbm.projects.lostfound.common.Result;
import me.qscbm.projects.lostfound.dto.AnnouncementRequest;
import me.qscbm.projects.lostfound.entity.Announcement;
import me.qscbm.projects.lostfound.service.AnnouncementService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@Validated
public class AnnouncementController {

    private final AnnouncementService announcementService;

    @GetMapping("/api/v1/announcements")
    public Result<PageResult<Announcement>> list(
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        IPage<Announcement> p = announcementService.list(page, size);
        return Result.success(PageResult.of(p));
    }

    @PostMapping("/api/v1/admin/announcements")
    public Result<Announcement> create(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody AnnouncementRequest req) {
        return Result.success(announcementService.create(userId, req.getTitle(), req.getContent()));
    }

    @PutMapping("/api/v1/admin/announcements/{id}")
    public Result<Announcement> update(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long id,
            @Valid @RequestBody AnnouncementRequest req) {
        return Result.success(announcementService.update(id, userId, req.getTitle(), req.getContent()));
    }

    @DeleteMapping("/api/v1/admin/announcements/{id}")
    public Result<?> delete(@AuthenticationPrincipal Long userId, @PathVariable Long id) {
        announcementService.delete(id, userId);
        return Result.success();
    }
}
