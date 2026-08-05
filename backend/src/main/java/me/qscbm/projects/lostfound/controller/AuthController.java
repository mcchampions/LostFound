package me.qscbm.projects.lostfound.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import me.qscbm.projects.lostfound.common.Result;
import me.qscbm.projects.lostfound.dto.*;
import me.qscbm.projects.lostfound.service.AuthService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Value("${app.jwt.expiration-ms:86400000}")
    private long tokenExpirationMs;

    @Value("${app.security.auth-cookie.secure:false}")
    private boolean secureCookie;

    @Value("${app.security.auth-cookie.same-site:Lax}")
    private String sameSite;

    @PostMapping("/register")
    public Result<UserVO> register(@Valid @RequestBody RegisterRequest req) {
        return Result.success(authService.register(req));
    }

    @PostMapping("/login")
    public Result<LoginResponse> login(@Valid @RequestBody LoginRequest req,
                                       HttpServletResponse response) {
        return authenticated(authService.login(req), response);
    }

    @PostMapping("/admin-login")
    public Result<LoginResponse> adminLogin(@Valid @RequestBody LoginRequest req,
                                            HttpServletResponse response) {
        return authenticated(authService.adminLogin(req), response);
    }

    @PostMapping("/refresh")
    public Result<LoginResponse> refresh(@AuthenticationPrincipal Long userId,
                                         HttpServletResponse response) {
        return authenticated(authService.refresh(userId), response);
    }

    @PostMapping("/logout")
    public Result<?> logout(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, authCookie(null, Duration.ZERO).toString());
        return Result.success();
    }

    @PostMapping("/forgot-password")
    public Result<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest req) {
        authService.sendPasswordResetCode(req.getEmail());
        return Result.success();
    }

    @PostMapping("/reset-password")
    public Result<?> resetPassword(@Valid @RequestBody ResetPasswordRequest req) {
        authService.resetPassword(req.getEmail(), req.getCode(), req.getNewPassword());
        return Result.success();
    }

    private Result<LoginResponse> authenticated(LoginResponse loginResponse,
                                                HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE,
                authCookie(loginResponse.getToken(), Duration.ofMillis(tokenExpirationMs)).toString());
        return Result.success(loginResponse);
    }

    private ResponseCookie authCookie(String token, Duration maxAge) {
        ResponseCookie.ResponseCookieBuilder builder = ResponseCookie.from("AUTH_TOKEN", token == null ? "" : token)
                .httpOnly(true)
                .secure(secureCookie)
                .sameSite(sameSite)
                .path("/")
                .maxAge(maxAge);
        return builder.build();
    }
}
