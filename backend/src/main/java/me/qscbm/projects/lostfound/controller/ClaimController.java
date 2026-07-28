package me.qscbm.projects.lostfound.controller;

import com.baomidou.mybatisplus.core.metadata.IPage;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import me.qscbm.projects.lostfound.common.BusinessException;
import me.qscbm.projects.lostfound.common.PageResult;
import me.qscbm.projects.lostfound.common.Result;
import me.qscbm.projects.lostfound.dto.ClaimRequest;
import me.qscbm.projects.lostfound.dto.ClaimVO;
import me.qscbm.projects.lostfound.service.ClaimService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/claims")
@RequiredArgsConstructor
public class ClaimController {

    private final ClaimService claimService;

    @PostMapping
    public Result<ClaimVO> apply(@AuthenticationPrincipal Long userId,
                                 @Valid @RequestBody ClaimRequest req) {
        return Result.success(claimService.apply(userId, req));
    }

    @GetMapping("/received")
    public Result<PageResult<ClaimVO>> received(
            @AuthenticationPrincipal Long userId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status) {
        IPage<ClaimVO> p = claimService.received(userId, page, size, status);
        return Result.success(PageResult.of(p));
    }

    @GetMapping("/sent")
    public Result<PageResult<ClaimVO>> sent(
            @AuthenticationPrincipal Long userId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String status) {
        IPage<ClaimVO> p = claimService.sent(userId, page, size, status);
        return Result.success(PageResult.of(p));
    }

    @PutMapping("/{id}")
    public Result<?> process(@AuthenticationPrincipal Long userId,
                             @PathVariable Long id,
                             @RequestBody Map<String, String> body) {
        String status = body.get("status");
        if (status == null || status.isBlank()) throw new BusinessException("处理状态不能为空");
        claimService.process(id, userId, status);
        return Result.success();
    }
}
