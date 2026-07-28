package me.qscbm.projects.lostfound.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import me.qscbm.projects.lostfound.common.BusinessException;
import me.qscbm.projects.lostfound.common.PageResult;
import me.qscbm.projects.lostfound.common.Result;
import me.qscbm.projects.lostfound.dto.FoundItemRequest;
import me.qscbm.projects.lostfound.dto.FoundItemVO;
import me.qscbm.projects.lostfound.service.FoundItemService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/found-items")
@RequiredArgsConstructor
@Validated
public class FoundItemController {

    private final FoundItemService foundItemService;

    @GetMapping
    public Result<PageResult<FoundItemVO>> list(
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String status) {
        IPage<FoundItemVO> p = foundItemService.page(page, size, keyword, categoryId, status);
        return Result.success(PageResult.of(p));
    }

    @GetMapping("/{id}")
    public Result<FoundItemVO> getById(@PathVariable Long id) {
        return Result.success(foundItemService.getById(id));
    }

    @PostMapping
    public Result<FoundItemVO> create(@AuthenticationPrincipal Long userId,
                                      @Valid @RequestBody FoundItemRequest req) {
        return Result.success(foundItemService.create(userId, req));
    }

    @PutMapping("/{id}")
    public Result<FoundItemVO> update(@AuthenticationPrincipal Long userId,
                                      @PathVariable Long id,
                                      @Valid @RequestBody FoundItemRequest req) {
        return Result.success(foundItemService.update(id, userId, req));
    }

    @DeleteMapping("/{id}")
    public Result<?> delete(@AuthenticationPrincipal Long userId, @PathVariable Long id) {
        foundItemService.delete(id, userId);
        return Result.success();
    }

    @PutMapping("/{id}/status")
    public Result<?> updateStatus(@AuthenticationPrincipal Long userId,
                                  @PathVariable Long id,
                                  @RequestBody Map<String, Object> body) {
        String status = asString(body.get("status"));
        if (status == null || status.isBlank()) throw new BusinessException("状态不能为空");
        String resolvedType = asString(body.get("resolvedType"));
        Object rb = body.get("resolvedBy");
        Long resolvedBy = rb instanceof Number ? ((Number) rb).longValue() : null;
        String resolvedNote = asString(body.get("resolvedNote"));
        foundItemService.updateStatus(id, userId, status, resolvedType, resolvedBy, resolvedNote);
        return Result.success();
    }

    private static String asString(Object o) {
        return o instanceof String ? (String) o : null;
    }
}
