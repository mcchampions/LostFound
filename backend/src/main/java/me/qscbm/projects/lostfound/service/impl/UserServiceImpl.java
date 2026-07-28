package me.qscbm.projects.lostfound.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import me.qscbm.projects.lostfound.common.BusinessException;
import me.qscbm.projects.lostfound.dto.UpdateProfileRequest;
import me.qscbm.projects.lostfound.dto.UserVO;
import me.qscbm.projects.lostfound.entity.User;
import me.qscbm.projects.lostfound.entity.enums.UserStatus;
import me.qscbm.projects.lostfound.mapper.UserMapper;
import me.qscbm.projects.lostfound.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.LongSupplier;

@Service
public class UserServiceImpl implements UserService {

    private static final long VERIFY_CODE_TTL_MS = 5 * 60 * 1000L;
    private static final long VERIFY_CODE_SEND_INTERVAL_MS = 60 * 1000L;

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JavaMailSender mailSender;
    private final SecureRandom secureRandom = new SecureRandom();
    private final Map<Long, VerificationCode> verifyCodes = new ConcurrentHashMap<>();
    private final LongSupplier currentTimeMillis;

    @Autowired
    public UserServiceImpl(UserMapper userMapper,
                           PasswordEncoder passwordEncoder,
                           JavaMailSender mailSender) {
        this(userMapper, passwordEncoder, mailSender, System::currentTimeMillis);
    }

    UserServiceImpl(UserMapper userMapper,
                    PasswordEncoder passwordEncoder,
                    JavaMailSender mailSender,
                    LongSupplier currentTimeMillis) {
        this.userMapper = userMapper;
        this.passwordEncoder = passwordEncoder;
        this.mailSender = mailSender;
        this.currentTimeMillis = currentTimeMillis;
    }

    @Override
    public UserVO getProfile(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) throw new BusinessException("用户不存在");
        return toVO(user);
    }

    @Override
    public UserVO updateProfile(Long userId, UpdateProfileRequest req) {
        User user = userMapper.selectById(userId);
        if (user == null) throw new BusinessException("用户不存在");
        if (req.getRealName() != null) user.setRealName(req.getRealName());
        if (req.getEmail() != null) {
            String newEmail = req.getEmail().isBlank() ? null : req.getEmail().trim();
            if (!Objects.equals(user.getEmail(), newEmail)) {
                user.setEmailVerified(0);
                user.setNotifyEmail(0);
                verifyCodes.remove(userId);
            }
            user.setEmail(newEmail);
        }
        if (req.getPhone() != null) user.setPhone(req.getPhone());
        if (req.getAvatar() != null) user.setAvatar(req.getAvatar());
        userMapper.updateById(user);
        return toVO(user);
    }

    @Override
    public IPage<UserVO> listUsers(int page, int size, String keyword) {
        LambdaQueryWrapper<User> qw = new LambdaQueryWrapper<>();
        if (keyword != null && !keyword.isEmpty()) {
            qw.and(w -> w.like(User::getUsername, keyword).or().like(User::getRealName, keyword));
        }
        qw.orderByDesc(User::getCreatedAt);
        IPage<User> p = userMapper.selectPage(new Page<>(page, size), qw);
        return p.convert(this::toVO);
    }

    @Override
    public void updateStatus(Long userId, String status) {
        User user = userMapper.selectById(userId);
        if (user == null) throw new BusinessException("用户不存在");
        if ("ADMIN".equals(user.getRole())) {
            throw new BusinessException("不能修改管理员账户状态");
        }
        try {
            user.setStatus(UserStatus.valueOf(status.toUpperCase()).getValue());
        } catch (IllegalArgumentException e) {
            throw new BusinessException("无效的用户状态，仅支持 ACTIVE、INACTIVE 或 PENDING");
        }
        userMapper.updateById(user);
    }

    @Override
    public void changePassword(Long userId, String oldPassword, String newPassword) {
        User user = userMapper.selectById(userId);
        if (user == null) throw new BusinessException("用户不存在");
        if (!passwordEncoder.matches(oldPassword, user.getPassword())) {
            throw new BusinessException("原密码错误");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        userMapper.updateById(user);
    }

    @Override
    public void sendVerifyCode(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) throw new BusinessException("用户不存在");
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            throw new BusinessException("请先设置邮箱");
        }
        long now = currentTimeMillis.getAsLong();
        VerificationCode verificationCode = verifyCodes.compute(userId, (id, existing) -> {
            if (existing != null && now - existing.sentAt() < VERIFY_CODE_SEND_INTERVAL_MS) {
                long waitSeconds =
                        (VERIFY_CODE_SEND_INTERVAL_MS - (now - existing.sentAt()) + 999) / 1000;
                throw new BusinessException("验证码发送过于频繁，请 " + waitSeconds + " 秒后再试");
            }
            String code = String.format("%06d", secureRandom.nextInt(1000000));
            return new VerificationCode(code, user.getEmail(), now, now + VERIFY_CODE_TTL_MS);
        });
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setTo(user.getEmail());
            msg.setSubject("校园失物招领 - 邮箱验证码");
            msg.setText("您的验证码是：" + verificationCode.code() + "，5分钟内有效。");
            mailSender.send(msg);
        } catch (Exception e) {
            verifyCodes.remove(userId, verificationCode);
            throw new BusinessException("验证码发送失败，请检查邮箱配置");
        }
    }

    @Override
    public void verifyEmail(Long userId, String code) {
        if (code == null || code.isBlank()) throw new BusinessException("验证码不能为空");
        VerificationCode expected = verifyCodes.get(userId);
        if (expected == null) {
            throw new BusinessException("验证码错误或已过期");
        }
        if (currentTimeMillis.getAsLong() > expected.expiresAt()) {
            verifyCodes.remove(userId);
            throw new BusinessException("验证码错误或已过期");
        }
        User user = userMapper.selectById(userId);
        if (user == null) throw new BusinessException("用户不存在");
        if (!Objects.equals(user.getEmail(), expected.email())) {
            verifyCodes.remove(userId);
            throw new BusinessException("邮箱已变更，请重新发送验证码");
        }
        if (!expected.code().equals(code.trim())) {
            throw new BusinessException("验证码错误或已过期");
        }
        user.setEmailVerified(1);
        userMapper.updateById(user);
        verifyCodes.remove(userId);
    }

    private UserVO toVO(User user) {
        return UserVO.builder()
                .id(user.getId()).username(user.getUsername())
                .realName(user.getRealName()).role(user.getRole())
                .email(user.getEmail()).phone(user.getPhone())
                .avatar(user.getAvatar())
                .status(user.getStatus()).build();
    }

    private record VerificationCode(String code, String email, long sentAt, long expiresAt) {
    }
}
