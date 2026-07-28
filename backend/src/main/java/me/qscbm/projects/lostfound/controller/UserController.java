package me.qscbm.projects.lostfound.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import me.qscbm.projects.lostfound.common.Result;
import me.qscbm.projects.lostfound.common.BusinessException;
import me.qscbm.projects.lostfound.dto.*;
import me.qscbm.projects.lostfound.mapper.UserMapper;
import me.qscbm.projects.lostfound.service.UserService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private final UserMapper userMapper;

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
    public Result<List<Map<String, Object>>> search(@RequestParam String q) {
        var users = userMapper.selectList(
            new com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper<me.qscbm.projects.lostfound.entity.User>()
                .like(me.qscbm.projects.lostfound.entity.User::getUsername, q).or()
                .like(me.qscbm.projects.lostfound.entity.User::getRealName, q)
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
}
