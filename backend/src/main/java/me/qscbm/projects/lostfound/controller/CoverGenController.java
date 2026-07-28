package me.qscbm.projects.lostfound.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import me.qscbm.projects.lostfound.common.BusinessException;
import me.qscbm.projects.lostfound.common.Result;
import me.qscbm.projects.lostfound.dto.CoverGenRequest;
import me.qscbm.projects.lostfound.service.CoverGenService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/cover")
@RequiredArgsConstructor
public class CoverGenController {

    private final CoverGenService coverGenService;

    @PostMapping("/generate")
    public Result<Map<String, String>> generate(
            @AuthenticationPrincipal Long userId,
            @Valid @RequestBody CoverGenRequest req) {
        if (userId == null) {
            throw new BusinessException("请先登录");
        }
        String url = coverGenService.generate(userId, req);
        return Result.success(Map.of("url", url));
    }
}
