package me.qscbm.projects.lostfound.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import me.qscbm.projects.lostfound.common.BusinessException;
import me.qscbm.projects.lostfound.common.PageResult;
import me.qscbm.projects.lostfound.common.Result;
import me.qscbm.projects.lostfound.service.ItemService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

public abstract class AbstractItemController<TRequest, TVO> {

    protected abstract ItemService<TRequest, TVO> itemService();

    @GetMapping
    public Result<PageResult<TVO>> list(
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size,
            @RequestParam(required = false) String keyword,
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String status) {
        IPage<TVO> result = itemService().page(page, size, keyword, categoryId, status);
        return Result.success(PageResult.of(result));
    }

    @GetMapping("/{id}")
    public Result<TVO> getById(@PathVariable Long id) {
        return Result.success(itemService().getById(id));
    }

    @PostMapping
    public Result<TVO> create(@AuthenticationPrincipal Long userId,
                              @Valid @RequestBody TRequest request) {
        return Result.success(itemService().create(userId, request));
    }

    @PutMapping("/{id}")
    public Result<TVO> update(@AuthenticationPrincipal Long userId,
                              @PathVariable Long id,
                              @Valid @RequestBody TRequest request) {
        return Result.success(itemService().update(id, userId, request));
    }

    @DeleteMapping("/{id}")
    public Result<?> delete(@AuthenticationPrincipal Long userId, @PathVariable Long id) {
        itemService().delete(id, userId);
        return Result.success();
    }

    @PutMapping("/{id}/status")
    public Result<?> updateStatus(@AuthenticationPrincipal Long userId,
                                  @PathVariable Long id,
                                  @RequestBody Map<String, Object> body) {
        String status = stringValue(body.get("status"));
        if (status == null || status.isBlank()) {
            throw new BusinessException("状态不能为空");
        }
        Object resolvedByValue = body.get("resolvedBy");
        Long resolvedBy = resolvedByValue instanceof Number number
                ? number.longValue() : null;
        itemService().updateStatus(id, userId, status,
                stringValue(body.get("resolvedType")), resolvedBy,
                stringValue(body.get("resolvedNote")));
        return Result.success();
    }

    private static String stringValue(Object value) {
        return value instanceof String string ? string : null;
    }
}
