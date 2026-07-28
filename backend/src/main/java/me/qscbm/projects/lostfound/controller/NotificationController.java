package me.qscbm.projects.lostfound.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import me.qscbm.projects.lostfound.common.PageResult;
import me.qscbm.projects.lostfound.common.Result;
import me.qscbm.projects.lostfound.entity.Notification;
import me.qscbm.projects.lostfound.service.NotificationService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
@Validated
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping
    public Result<PageResult<Notification>> list(
            @AuthenticationPrincipal Long userId,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        IPage<Notification> p = notificationService.list(userId, page, size);
        return Result.success(PageResult.of(p));
    }

    @PutMapping("/{id}/read")
    public Result<?> markRead(@AuthenticationPrincipal Long userId, @PathVariable Long id) {
        notificationService.markRead(userId, id);
        return Result.success();
    }

    @PutMapping("/read-all")
    public Result<?> markAllRead(@AuthenticationPrincipal Long userId) {
        notificationService.markAllRead(userId);
        return Result.success();
    }

    @GetMapping("/unread-count")
    public Result<Long> getUnreadCount(@AuthenticationPrincipal Long userId) {
        return Result.success(notificationService.getUnreadCount(userId));
    }
}
