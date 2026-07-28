package me.qscbm.projects.lostfound.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import me.qscbm.projects.lostfound.common.Result;
import me.qscbm.projects.lostfound.entity.Category;
import me.qscbm.projects.lostfound.service.CategoryService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

    @GetMapping("/categories")
    public Result<List<Category>> list() {
        return Result.success(categoryService.list());
    }

    @PostMapping("/admin/categories")
    public Result<Category> create(@Valid @RequestBody CategoryRequest body) {
        return Result.success(categoryService.create(body.getName(), body.getSortOrder()));
    }

    @PutMapping("/admin/categories/{id}")
    public Result<Category> update(@PathVariable Long id, @Valid @RequestBody CategoryRequest body) {
        return Result.success(categoryService.update(id, body.getName(), body.getSortOrder()));
    }

    @DeleteMapping("/admin/categories/{id}")
    public Result<?> delete(@PathVariable Long id) {
        categoryService.delete(id);
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
