package me.qscbm.projects.lostfound.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import me.qscbm.projects.lostfound.common.Result;
import me.qscbm.projects.lostfound.common.BusinessException;
import me.qscbm.projects.lostfound.common.PageResult;
import me.qscbm.projects.lostfound.dto.*;
import me.qscbm.projects.lostfound.entity.User;
import me.qscbm.projects.lostfound.entity.UserEmailPreference;
import me.qscbm.projects.lostfound.mapper.UserEmailPreferenceMapper;
import me.qscbm.projects.lostfound.mapper.UserMapper;
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
    private final UserMapper userMapper;
    private final UserEmailPreferenceMapper emailPreferenceMapper;

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
        var users = userMapper.selectList(
            new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<User>()
                .eq(User::getStatus, "ACTIVE")
                .and(w -> w.like(User::getUsername, q).or()
                    .like(User::getRealName, q))
                .last("LIMIT 10"));
        var list = users.stream().map(u -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", u.getId());
            m.put("username", u.getUsername());
            m.put("realName", u.getRealName());
            return m;
        }).toList();
        return Result.success(list);
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
        var user = userMapper.selectById(userId);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("notifyEmail", user.getNotifyEmail() != null && user.getNotifyEmail() == 1);
        m.put("emailVerified", user.getEmailVerified() != null && user.getEmailVerified() == 1);
        return Result.success(m);
    }

    @PutMapping("/me/preferences")
    public Result<?> updatePreferences(@AuthenticationPrincipal Long userId, @RequestBody Map<String, Object> body) {
        var user = userMapper.selectById(userId);
        if (body.containsKey("notifyEmail")) {
            boolean enabled = Boolean.TRUE.equals(body.get("notifyEmail"));
            if (enabled && (user.getEmailVerified() == null || user.getEmailVerified() != 1)) {
                throw new BusinessException("请先验证邮箱");
            }
            user.setNotifyEmail(enabled ? 1 : 0);
        }
        userMapper.updateById(user);
        return Result.success();
    }

    @GetMapping("/me/email-preferences")
    public Result<Map<String, Object>> getEmailPreferences(@AuthenticationPrincipal Long userId) {
        var user = userMapper.selectById(userId);
        boolean emailVerified = user.getEmailVerified() != null && user.getEmailVerified() == 1;
        UserEmailPreference pref = emailPreferenceMapper.selectById(userId);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("emailVerified", emailVerified);
        if (pref == null) {
            boolean legacy = user.getNotifyEmail() != null && user.getNotifyEmail() == 1;
            m.put("claim_request", legacy);
            m.put("claim_result", legacy);
            m.put("announcement", legacy);
            m.put("message", legacy);
            m.put("system", true);
        } else {
            m.put("claim_request", pref.getClaimRequest() != null && pref.getClaimRequest() == 1);
            m.put("claim_result", pref.getClaimResult() != null && pref.getClaimResult() == 1);
            m.put("announcement", pref.getAnnouncement() != null && pref.getAnnouncement() == 1);
            m.put("message", pref.getMessage() != null && pref.getMessage() == 1);
            m.put("system", true);
        }
        return Result.success(m);
    }

    @PutMapping("/me/email-preferences")
    public Result<?> updateEmailPreferences(@AuthenticationPrincipal Long userId,
                                             @RequestBody Map<String, Object> body) {
        var user = userMapper.selectById(userId);
        boolean emailVerified = user.getEmailVerified() != null && user.getEmailVerified() == 1;
        UserEmailPreference pref = emailPreferenceMapper.selectById(userId);
        if (pref == null) {
            pref = new UserEmailPreference();
            pref.setUserId(userId);
            boolean legacy = user.getNotifyEmail() != null && user.getNotifyEmail() == 1;
            pref.setClaimRequest(legacy ? 1 : 0);
            pref.setClaimResult(legacy ? 1 : 0);
            pref.setAnnouncement(legacy ? 1 : 0);
            pref.setMessage(legacy ? 1 : 0);
            pref.setSystem(1);
        }
        for (String key : List.of("claim_request", "claim_result", "announcement", "message")) {
            if (body.containsKey(key)) {
                if (!emailVerified) {
                    throw new BusinessException("请先验证邮箱后再开启邮件提醒");
                }
                boolean enabled = Boolean.TRUE.equals(body.get(key));
                switch (key) {
                    case "claim_request" -> pref.setClaimRequest(enabled ? 1 : 0);
                    case "claim_result" -> pref.setClaimResult(enabled ? 1 : 0);
                    case "announcement" -> pref.setAnnouncement(enabled ? 1 : 0);
                    case "message" -> pref.setMessage(enabled ? 1 : 0);
                }
            }
        }
        // system is always on
        pref.setSystem(1);
        if (emailPreferenceMapper.selectById(userId) == null) {
            emailPreferenceMapper.insert(pref);
        } else {
            emailPreferenceMapper.updateById(pref);
        }
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
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size) {
        return Result.success(PageResult.of(
                userService.getUserItems(id, scope, type, page, size)));
    }
}
