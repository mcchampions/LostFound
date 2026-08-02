package me.qscbm.projects.lostfound.service.impl;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import me.qscbm.projects.lostfound.common.BusinessException;
import me.qscbm.projects.lostfound.common.CodeHasher;
import me.qscbm.projects.lostfound.common.EmailNormalizer;
import me.qscbm.projects.lostfound.dto.*;
import me.qscbm.projects.lostfound.entity.PasswordResetCode;
import me.qscbm.projects.lostfound.entity.User;
import me.qscbm.projects.lostfound.entity.enums.UserRole;
import me.qscbm.projects.lostfound.entity.enums.UserStatus;
import me.qscbm.projects.lostfound.mapper.PasswordResetCodeMapper;
import me.qscbm.projects.lostfound.mapper.UserMapper;
import me.qscbm.projects.lostfound.security.JwtUtils;
import me.qscbm.projects.lostfound.service.AuthService;
import me.qscbm.projects.lostfound.service.LoginAttemptService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;

import java.time.LocalDateTime;
import java.security.SecureRandom;
import java.util.Objects;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private static final long RESET_CODE_TTL_MS = 5 * 60 * 1000L;
    private static final long RESET_CODE_SEND_INTERVAL_MS = 60 * 1000L;
    private static final int RESET_CODE_MAX_ATTEMPTS = 5;

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtils jwtUtils;
    private final PasswordResetCodeMapper passwordResetCodeMapper;
    private final JavaMailSender mailSender;
    private final OperationLogRecorder operationLogRecorder;
    private final LoginAttemptService loginAttemptService;
    private final EmailContentBuilder emailContentBuilder;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${spring.mail.username:}")
    private String mailFrom;

    @Override
    public UserVO register(RegisterRequest req) {
        boolean exists = userMapper.exists(
                new LambdaQueryWrapper<User>()
                        .eq(User::getUsername, req.getUsername()));
        if (exists) throw new BusinessException("用户名已存在");
        String email = EmailNormalizer.normalize(req.getEmail());
        if (email != null && userMapper.exists(
                new LambdaQueryWrapper<User>().eq(User::getEmail, email))) {
            throw new BusinessException("该邮箱已被其他账号使用");
        }

        User user = new User();
        user.setUsername(req.getUsername());
        user.setPassword(passwordEncoder.encode(req.getPassword()));
        user.setRealName(req.getRealName());
        user.setEmail(email);
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
        try {
            userMapper.insert(user);
        } catch (DuplicateKeyException e) {
            throw new BusinessException("用户名或邮箱已存在");
        }
        log.info("用户注册: userId={} username={} role={}", user.getId(), user.getUsername(), user.getRole());
        operationLogRecorder.log(user.getId(), "REGISTER", "USER", user.getId(),
                "注册账号（角色：" + user.getRole() + "）");
        return toVO(user);
    }

    @Override
    public LoginResponse login(LoginRequest req) {
        checkLoginThrottle(req.getUsername());
        User user = userMapper.selectOne(
                new LambdaQueryWrapper<User>()
                        .eq(User::getUsername, req.getUsername()));
        if (user == null || !passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            loginAttemptService.recordFailure(req.getUsername(), currentIp());
            operationLogRecorder.log(user != null ? user.getId() : null, "LOGIN_FAILED", "USER",
                    user != null ? user.getId() : null, "登录失败：" + req.getUsername());
            throw new BusinessException("用户名或密码错误");
        }
        if (UserStatus.PENDING.getValue().equals(user.getStatus())) {
            throw new BusinessException("账号待审核，请联系管理员");
        }
        if (UserStatus.INACTIVE.getValue().equals(user.getStatus())) {
            throw new BusinessException("账号已被禁用");
        }
        String token = jwtUtils.generate(user.getId(), user.getUsername(), user.getRole());
        loginAttemptService.reset(req.getUsername());
        log.info("用户登录: userId={} username={}", user.getId(), user.getUsername());
        operationLogRecorder.log(user.getId(), "LOGIN", "USER", user.getId(), "用户登录");
        return new LoginResponse(token, toVO(user));
    }

    @Override
    public LoginResponse adminLogin(LoginRequest req) {
        checkLoginThrottle(req.getUsername());
        User user = userMapper.selectOne(
                new LambdaQueryWrapper<User>()
                        .eq(User::getUsername, req.getUsername()));
        if (user == null || !passwordEncoder.matches(req.getPassword(), user.getPassword())) {
            loginAttemptService.recordFailure(req.getUsername(), currentIp());
            operationLogRecorder.log(user != null ? user.getId() : null, "ADMIN_LOGIN_FAILED", "USER",
                    user != null ? user.getId() : null, "管理员登录失败：" + req.getUsername());
            throw new BusinessException("用户名或密码错误");
        }
        if (!UserRole.ADMIN.getValue().equals(user.getRole())) {
            throw new BusinessException("该账号不是管理员，请使用普通用户登录");
        }
        if (!UserStatus.ACTIVE.getValue().equals(user.getStatus())) {
            throw new BusinessException("账号已被禁用");
        }
        String token = jwtUtils.generate(user.getId(), user.getUsername(), user.getRole());
        loginAttemptService.reset(req.getUsername());
        log.info("管理员登录: userId={} username={}", user.getId(), user.getUsername());
        operationLogRecorder.log(user.getId(), "ADMIN_LOGIN", "USER", user.getId(), "管理员登录");
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

    @Override
    public void sendPasswordResetCode(String email) {
        String normalized = EmailNormalizer.normalize(email);
        if (normalized == null) {
            return;
        }
        User user = userMapper.selectOne(
                new LambdaQueryWrapper<User>().eq(User::getEmail, normalized));
        // 统一响应，不暴露邮箱是否已注册
        if (user == null || !UserStatus.ACTIVE.getValue().equals(user.getStatus())) {
            log.info("密码重置: 邮箱 {} 无可用账号，不发送", maskEmail(normalized));
            return;
        }

        long now = System.currentTimeMillis();
        String code = String.format("%06d", secureRandom.nextInt(1000000));
        PasswordResetCode record = new PasswordResetCode();
        record.setUserId(user.getId());
        record.setEmail(normalized);
        record.setCodeHash(CodeHasher.hash(code));
        record.setSentAt(now);
        record.setExpiresAt(now + RESET_CODE_TTL_MS);
        record.setAttempts(0);

        int updated = passwordResetCodeMapper.updateIfCooldown(
                record, now - RESET_CODE_SEND_INTERVAL_MS);
        if (updated == 0) {
            try {
                passwordResetCodeMapper.insert(record);
            } catch (DuplicateKeyException e) {
                throw new BusinessException("验证码发送过于频繁，请稍后再试");
            }
        }
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            if (mailFrom != null && !mailFrom.isBlank()) {
                msg.setFrom(mailFrom);
            }
            msg.setTo(normalized);
            msg.setSubject("校园失物招领 - 重置密码验证码");
            msg.setText("您的重置密码验证码是：" + code
                    + "，5分钟内有效。如非本人操作，请忽略此邮件。"
                    + "\n\n前往找回密码页面：" + emailContentBuilder.url("/forgot-password"));
            mailSender.send(msg);
        } catch (Exception e) {
            passwordResetCodeMapper.deleteMatching(user.getId(), record.getCodeHash());
            throw new BusinessException("验证码发送失败，请检查邮箱配置");
        }
        log.info("密码重置: userId={} 已发送重置验证码", user.getId());
        operationLogRecorder.log(user.getId(), "SEND_PASSWORD_RESET", "USER",
                user.getId(), "发送重置密码验证码");
    }

    @Override
    public void resetPassword(String email, String code, String newPassword) {
        String normalized = EmailNormalizer.normalize(email);
        if (normalized == null || code == null || code.isBlank()) {
            throw new BusinessException("验证码错误或已过期");
        }
        User user = userMapper.selectOne(
                new LambdaQueryWrapper<User>().eq(User::getEmail, normalized));
        if (user == null) {
            throw new BusinessException("验证码错误或已过期");
        }
        PasswordResetCode record = passwordResetCodeMapper.selectById(user.getId());
        if (record == null) {
            throw new BusinessException("验证码错误或已过期");
        }
        if (System.currentTimeMillis() > record.getExpiresAt()) {
            passwordResetCodeMapper.deleteById(user.getId());
            throw new BusinessException("验证码错误或已过期");
        }
        int attempts = record.getAttempts() == null ? 0 : record.getAttempts();
        if (attempts >= RESET_CODE_MAX_ATTEMPTS) {
            passwordResetCodeMapper.deleteById(user.getId());
            throw new BusinessException("验证码错误次数过多，请重新发送");
        }
        if (!Objects.equals(normalized, record.getEmail())) {
            passwordResetCodeMapper.deleteById(user.getId());
            throw new BusinessException("验证码错误或已过期");
        }
        if (!CodeHasher.matches(code.trim(), record.getCodeHash())) {
            passwordResetCodeMapper.incrementAttempts(user.getId(), RESET_CODE_MAX_ATTEMPTS);
            int remaining = RESET_CODE_MAX_ATTEMPTS - attempts - 1;
            if (remaining <= 0) {
                passwordResetCodeMapper.deleteById(user.getId());
                throw new BusinessException("验证码错误次数过多，请重新发送");
            }
            throw new BusinessException("验证码错误，还可尝试 " + remaining + " 次");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        user.setPasswordChangedAt(LocalDateTime.now());
        userMapper.updateById(user);
        passwordResetCodeMapper.deleteById(user.getId());
        log.info("密码重置: userId={} 重置密码成功", user.getId());
        operationLogRecorder.log(user.getId(), "RESET_PASSWORD", "USER",
                user.getId(), "通过邮箱验证码重置密码");
    }

    private String maskEmail(String email) {
        int at = email.indexOf('@');
        if (at <= 2) {
            return "***" + (at >= 0 ? email.substring(at) : "");
        }
        return email.substring(0, 2) + "***" + email.substring(at);
    }

    private void checkLoginThrottle(String username) {
        String ip = currentIp();
        if (loginAttemptService.isLocked(username, ip)) {
            long remainingMinutes = Math.max(1,
                    loginAttemptService.remainingLockSeconds(username, ip) / 60 + 1);
            throw new BusinessException("登录失败次数过多，请 " + remainingMinutes + " 分钟后再试");
        }
        if (loginAttemptService.isIpBlocked(ip)) {
            throw new BusinessException("请求过于频繁，请稍后再试");
        }
    }

    private String currentIp() {
        try {
            ServletRequestAttributes attrs =
                    (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attrs != null && attrs.getRequest() != null) {
                return attrs.getRequest().getRemoteAddr();
            }
        } catch (Exception ignored) {
            // 非 Web 上下文（如测试）时忽略
        }
        return null;
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
