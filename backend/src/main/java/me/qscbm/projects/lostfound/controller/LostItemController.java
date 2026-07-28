package me.qscbm.projects.lostfound.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import me.qscbm.projects.lostfound.common.BusinessException;
import me.qscbm.projects.lostfound.common.PageResult;
import me.qscbm.projects.lostfound.common.Result;
import me.qscbm.projects.lostfound.dto.LostItemRequest;
import me.qscbm.projects.lostfound.dto.LostItemVO;
import me.qscbm.projects.lostfound.service.LostItemService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/lost-items")
@RequiredArgsConstructor
public class LostItemController {

    private final LostItemService lostItemService;

    @GetMapping
    public Result<PageResult<LostItemVO>> list(
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String status) {
        IPage<LostItemVO> p = lostItemService.page(page, size, keyword, categoryId, status);
        return Result.success(PageResult.of(p));
    }

    @GetMapping("/{id}")
    public Result<LostItemVO> getById(@PathVariable Long id) {
        return Result.success(lostItemService.getById(id));
    }

    @PostMapping
    public Result<LostItemVO> create(@AuthenticationPrincipal Long userId,
                                     @Valid @RequestBody LostItemRequest req) {
        return Result.success(lostItemService.create(userId, req));
    }

    @PutMapping("/{id}")
    public Result<LostItemVO> update(@AuthenticationPrincipal Long userId,
                                     @PathVariable Long id,
                                     @Valid @RequestBody LostItemRequest req) {
        return Result.success(lostItemService.update(id, userId, req));
    }

    @DeleteMapping("/{id}")
    public Result<?> delete(@AuthenticationPrincipal Long userId, @PathVariable Long id) {
        lostItemService.delete(id, userId);
        return Result.success();
    }

    @PutMapping("/{id}/status")
    public Result<?> updateStatus(@AuthenticationPrincipal Long userId,
                                  @PathVariable Long id,
                                  @RequestBody Map<String, Object> body) {
        String status = asString(body.get("status"));
        if (status == null || status.isBlank()) {
            throw new BusinessException("状态不能为空");
        }
        String resolvedType = asString(body.get("resolvedType"));
        Object rb = body.get("resolvedBy");
        Long resolvedBy = rb instanceof Number ? ((Number) rb).longValue() : null;
        String resolvedNote = asString(body.get("resolvedNote"));
        lostItemService.updateStatus(id, userId, status, resolvedType, resolvedBy, resolvedNote);
        return Result.success();
    }

    private static String asString(Object o) {
        return o instanceof String ? (String) o : null;
    }
}
