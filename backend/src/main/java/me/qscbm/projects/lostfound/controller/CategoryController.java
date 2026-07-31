package me.qscbm.projects.lostfound.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import me.qscbm.projects.lostfound.common.Result;
import me.qscbm.projects.lostfound.entity.Category;
import me.qscbm.projects.lostfound.service.CategoryService;
import me.qscbm.projects.lostfound.service.impl.OperationLogRecorder;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;
    private final OperationLogRecorder operationLogRecorder;

    @GetMapping("/categories")
    public Result<List<Category>> list() {
        return Result.success(categoryService.list());
    }

    @PostMapping("/admin/categories")
    public Result<Category> create(@AuthenticationPrincipal Long userId,
                                   @Valid @RequestBody CategoryRequest body) {
        Category category = categoryService.create(body.getName(), body.getSortOrder());
        operationLogRecorder.log(userId, "CATEGORY_CREATE", "CATEGORY", category.getId(),
                "新增分类：" + category.getName());
        return Result.success(category);
    }

    @PutMapping("/admin/categories/{id}")
    public Result<Category> update(@AuthenticationPrincipal Long userId,
                                   @PathVariable Long id, @Valid @RequestBody CategoryRequest body) {
        Category category = categoryService.update(id, body.getName(), body.getSortOrder());
        operationLogRecorder.log(userId, "CATEGORY_UPDATE", "CATEGORY", id,
                "更新分类：" + category.getName());
        return Result.success(category);
    }

    @DeleteMapping("/admin/categories/{id}")
    public Result<?> delete(@AuthenticationPrincipal Long userId, @PathVariable Long id) {
        categoryService.delete(id);
        operationLogRecorder.log(userId, "CATEGORY_DELETE", "CATEGORY", id, "删除分类");
        return Result.success();
    }

    @Data
    static class CategoryRequest {
        @NotBlank(message = "分类名称不能为空")
        @Size(max = 50)
        private String name;
        private Integer sortOrder = 0;
    }
}
