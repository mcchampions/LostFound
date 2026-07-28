package me.qscbm.projects.lostfound.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.qscbm.projects.lostfound.common.BusinessException;
import me.qscbm.projects.lostfound.dto.*;
import me.qscbm.projects.lostfound.entity.User;
import me.qscbm.projects.lostfound.entity.enums.UserRole;
import me.qscbm.projects.lostfound.entity.enums.UserStatus;
import me.qscbm.projects.lostfound.mapper.UserMapper;
import me.qscbm.projects.lostfound.security.JwtUtils;
import me.qscbm.projects.lostfound.service.AuthService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;

    @Override
    public UserVO register(RegisterRequest req) {
        boolean exists = userMapper.exists(
                new LambdaQueryWrapper<User>()
                        .eq(User::getUsername, req.getUsername()));
        if (exists) throw new BusinessException("用户名已存在");

        User user = new User();
        user.setUsername(req.getUsername());
        user.setPassword(passwordEncoder.encode(req.getPassword()));
        user.setRealName(req.getRealName());
        user.setEmail(req.getEmail());
        user.setPhone(req.getPhone());

        UserRole role;
        try {
            role = UserRole.valueOf(req.getRole().toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new BusinessException("无效的用户角色，仅支持 STUDENT 或 TEACHER");
        }
        // Prevent self-registration as ADMIN
        if (role == UserRole.ADMIN) {
            throw new BusinessException("不允许自行注册管理员账号");
        }
        user.setRole(role.getValue());
        if (role == UserRole.STUDENT) {
            user.setStatus(UserStatus.ACTIVE.getValue());
        } else {
            user.setStatus(UserStatus.PENDING.getValue());
        }
        userMapper.insert(user);
        return toVO(user);
    }

    @Override
    public LoginResponse login(LoginRequest req) {
        User user = userMapper.selectOne(
                new LambdaQueryWrapper<User>()
                        .eq(User::getUsername, req.getUsername()));
        if (user == null || !passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            throw new BusinessException("用户名或密码错误");
        }
        if (UserStatus.PENDING.getValue().equals(user.getStatus())) {
            throw new BusinessException("账号待审核，请联系管理员");
        }
        if (UserStatus.INACTIVE.getValue().equals(user.getStatus())) {
            throw new BusinessException("账号已被禁用");
        }
        String token = jwtUtils.generate(user.getId(), user.getUsername(), user.getRole());
        return new LoginResponse(token, toVO(user));
    }

    @Override
    public LoginResponse adminLogin(LoginRequest req) {
        User user = userMapper.selectOne(
                new LambdaQueryWrapper<User>()
                        .eq(User::getUsername, req.getUsername()));
        if (user == null || !passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            throw new BusinessException("用户名或密码错误");
        }
        if (!UserRole.ADMIN.getValue().equals(user.getRole())) {
            throw new BusinessException("该账号不是管理员，请使用普通用户登录");
        }
        if (!UserStatus.ACTIVE.getValue().equals(user.getStatus())) {
            throw new BusinessException("账号已被禁用");
        }
        String token = jwtUtils.generate(user.getId(), user.getUsername(), user.getRole());
        return new LoginResponse(token, toVO(user));
    }

    @Override
    public LoginResponse refresh(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException("用户不存在");
        }
        if (UserStatus.PENDING.getValue().equals(user.getStatus())) {
            throw new BusinessException("账号待审核，请联系管理员");
        }
        if (UserStatus.INACTIVE.getValue().equals(user.getStatus())) {
            throw new BusinessException("账号已被禁用");
        }
        String token = jwtUtils.generate(user.getId(), user.getUsername(), user.getRole());
        return new LoginResponse(token, toVO(user));
    }

    private UserVO toVO(User user) {
        return UserVO.builder()
                .id(user.getId()).username(user.getUsername())
                .realName(user.getRealName()).role(user.getRole())
                .email(user.getEmail()).phone(user.getPhone())
                .avatar(user.getAvatar())
                .status(user.getStatus()).build();
    }
}
