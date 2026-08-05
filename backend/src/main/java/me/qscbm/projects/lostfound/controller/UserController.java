package me.qscbm.projects.lostfound.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import me.qscbm.projects.lostfound.common.Result;
import me.qscbm.projects.lostfound.common.PageResult;
import me.qscbm.projects.lostfound.dto.*;
import me.qscbm.projects.lostfound.service.UserService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
@Validated
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public Result<UserVO> getProfile(@AuthenticationPrincipal Long userId) {
        return Result.success(userService.getProfile(userId));
    }

    @PutMapping("/me")
    public Result<UserVO> updateProfile(@AuthenticationPrincipal Long userId,
                                        @Valid @RequestBody UpdateProfileRequest req) {
        return Result.success(userService.updateProfile(userId, req));
    }

    @PutMapping("/me/password")
    public Result<?> changePassword(@AuthenticationPrincipal Long userId,
                                     @Valid @RequestBody ChangePasswordRequest req) {
        userService.changePassword(userId, req.getOldPassword(), req.getNewPassword());
        return Result.success();
    }

    @GetMapping("/search")
    public Result<List<Map<String, Object>>> search(@RequestParam @Size(min = 1, max = 50) String q) {
        return Result.success(userService.searchUsers(q));
    }

    @PostMapping("/me/send-verify-code")
    public Result<?> sendVerifyCode(@AuthenticationPrincipal Long userId) {
        userService.sendVerifyCode(userId);
        return Result.success();
    }

    @PostMapping("/me/verify-email")
    public Result<?> verifyEmail(@AuthenticationPrincipal Long userId, @RequestBody Map<String, String> body) {
        userService.verifyEmail(userId, body.get("code"));
        return Result.success();
    }

    @GetMapping("/me/preferences")
    public Result<Map<String, Object>> getPreferences(@AuthenticationPrincipal Long userId) {
        return Result.success(userService.getPreferences(userId));
    }

    @PutMapping("/me/preferences")
    public Result<?> updatePreferences(@AuthenticationPrincipal Long userId, @RequestBody Map<String, Object> body) {
        userService.updatePreferences(userId, body);
        return Result.success();
    }

    @GetMapping("/me/email-preferences")
    public Result<Map<String, Object>> getEmailPreferences(@AuthenticationPrincipal Long userId) {
        return Result.success(userService.getEmailPreferences(userId));
    }

    @PutMapping("/me/email-preferences")
    public Result<?> updateEmailPreferences(@AuthenticationPrincipal Long userId,
                                             @RequestBody Map<String, Object> body) {
        userService.updateEmailPreferences(userId, body);
        return Result.success();
    }

    @GetMapping("/{id}/public-profile")
    public Result<PublicProfileVO> getPublicProfile(@PathVariable Long id) {
        return Result.success(userService.getPublicProfile(id));
    }

    @GetMapping("/{id}/items")
    public Result<PageResult<UserItemVO>> getUserItems(
            @PathVariable Long id,
            @RequestParam(defaultValue = "published") String scope,
            @RequestParam(defaultValue = "all") String type,
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return Result.success(PageResult.of(
                userService.getUserItems(id, scope, type, page, size)));
    }
}
