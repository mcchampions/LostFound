package me.qscbm.projects.lostfound.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import me.qscbm.projects.lostfound.common.Result;
import me.qscbm.projects.lostfound.dto.*;
import me.qscbm.projects.lostfound.service.AuthService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public Result<UserVO> register(@Valid @RequestBody RegisterRequest req) {
        return Result.success(authService.register(req));
    }

    @PostMapping("/login")
    public Result<LoginResponse> login(@Valid @RequestBody LoginRequest req) {
        return Result.success(authService.login(req));
    }

    @PostMapping("/admin-login")
    public Result<LoginResponse> adminLogin(@Valid @RequestBody LoginRequest req) {
        return Result.success(authService.adminLogin(req));
    }

    @PostMapping("/refresh")
    public Result<LoginResponse> refresh(@AuthenticationPrincipal Long userId) {
        return Result.success(authService.refresh(userId));
    }
}
