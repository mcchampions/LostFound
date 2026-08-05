package me.qscbm.projects.lostfound.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import me.qscbm.projects.lostfound.common.BusinessException;
import me.qscbm.projects.lostfound.common.CodeHasher;
import me.qscbm.projects.lostfound.common.EmailNormalizer;
import me.qscbm.projects.lostfound.common.UserVOMapper;
import me.qscbm.projects.lostfound.dto.PublicProfileVO;
import me.qscbm.projects.lostfound.dto.UpdateProfileRequest;
import me.qscbm.projects.lostfound.dto.UserItemVO;
import me.qscbm.projects.lostfound.dto.UserVO;
import me.qscbm.projects.lostfound.entity.EmailVerificationCode;
import me.qscbm.projects.lostfound.entity.FoundItem;
import me.qscbm.projects.lostfound.entity.LostItem;
import me.qscbm.projects.lostfound.entity.User;
import me.qscbm.projects.lostfound.entity.UserEmailPreference;
import me.qscbm.projects.lostfound.entity.enums.UserStatus;
import me.qscbm.projects.lostfound.entity.enums.UserRole;
import me.qscbm.projects.lostfound.entity.enums.LostItemStatus;
import me.qscbm.projects.lostfound.entity.enums.FoundItemStatus;
import me.qscbm.projects.lostfound.mapper.EmailVerificationCodeMapper;
import me.qscbm.projects.lostfound.mapper.FoundItemMapper;
import me.qscbm.projects.lostfound.mapper.LostItemMapper;
import me.qscbm.projects.lostfound.mapper.UserEmailPreferenceMapper;
import me.qscbm.projects.lostfound.mapper.UserItemMapper;
import me.qscbm.projects.lostfound.mapper.UserMapper;
import me.qscbm.projects.lostfound.service.UserService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.security.SecureRandom;
import java.util.*;
import java.util.function.LongSupplier;

@Slf4j
@Service
public class UserServiceImpl implements UserService {

    private static final long VERIFY_CODE_TTL_MS = 5 * 60 * 1000L;
    private static final long VERIFY_CODE_SEND_INTERVAL_MS = 60 * 1000L;
    private static final int VERIFY_CODE_MAX_ATTEMPTS = 5;

    private final UserMapper userMapper;
    private final PasswordEncoder passwordEncoder;
    private final JavaMailSender mailSender;
    private final EmailVerificationCodeMapper verificationCodeMapper;
    private final LostItemMapper lostItemMapper;
    private final FoundItemMapper foundItemMapper;
    private final UserEmailPreferenceMapper emailPreferenceMapper;
    private final UserItemMapper userItemMapper;
    private final OperationLogRecorder operationLogRecorder;
    private final EmailContentBuilder emailContentBuilder;
    private final SecureRandom secureRandom = new SecureRandom();
    private final LongSupplier currentTimeMillis;

    @Value("${spring.mail.username:}")
    private String mailFrom;

    @Autowired
    public UserServiceImpl(UserMapper userMapper,
                           PasswordEncoder passwordEncoder,
                           JavaMailSender mailSender,
                           EmailVerificationCodeMapper verificationCodeMapper,
                           LostItemMapper lostItemMapper,
                           FoundItemMapper foundItemMapper,
                           UserEmailPreferenceMapper emailPreferenceMapper,
                           UserItemMapper userItemMapper,
                           OperationLogRecorder operationLogRecorder,
                           EmailContentBuilder emailContentBuilder) {
        this(userMapper, passwordEncoder, mailSender, verificationCodeMapper,
             lostItemMapper, foundItemMapper, emailPreferenceMapper, userItemMapper, operationLogRecorder,
             emailContentBuilder, System::currentTimeMillis);
    }

    UserServiceImpl(UserMapper userMapper,
                    PasswordEncoder passwordEncoder,
                    JavaMailSender mailSender,
                    EmailVerificationCodeMapper verificationCodeMapper,
                    LostItemMapper lostItemMapper,
                    FoundItemMapper foundItemMapper,
                    UserEmailPreferenceMapper emailPreferenceMapper,
                    UserItemMapper userItemMapper,
                    OperationLogRecorder operationLogRecorder,
                    EmailContentBuilder emailContentBuilder,
                    LongSupplier currentTimeMillis) {
        this.userMapper = userMapper;
        this.passwordEncoder = passwordEncoder;
        this.mailSender = mailSender;
        this.verificationCodeMapper = verificationCodeMapper;
        this.lostItemMapper = lostItemMapper;
        this.foundItemMapper = foundItemMapper;
        this.emailPreferenceMapper = emailPreferenceMapper;
        this.userItemMapper = userItemMapper;
        this.operationLogRecorder = operationLogRecorder;
        this.emailContentBuilder = emailContentBuilder;
        this.currentTimeMillis = currentTimeMillis;
    }

    @Override
    public UserVO getProfile(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) throw new BusinessException("用户不存在");
        return UserVOMapper.toVO(user);
    }

    @Override
    public UserVO updateProfile(Long userId, UpdateProfileRequest req) {
        User user = userMapper.selectById(userId);
        if (user == null) throw new BusinessException("用户不存在");
        if (req.getRealName() != null) user.setRealName(req.getRealName());
        if (req.getEmail() != null) {
            String newEmail = EmailNormalizer.normalize(req.getEmail());
            if (!Objects.equals(user.getEmail(), newEmail)) {
                if (newEmail != null && userMapper.exists(
                        new LambdaQueryWrapper<User>()
                                .eq(User::getEmail, newEmail)
                                .ne(User::getId, userId))) {
                    throw new BusinessException("该邮箱已被其他账号使用");
                }
                user.setEmailVerified(false);
                user.setNotifyEmail(false);
                verificationCodeMapper.deleteById(userId);
                emailPreferenceMapper.deleteById(userId);
            }
            user.setEmail(newEmail);
        }
        if (req.getPhone() != null) user.setPhone(req.getPhone());
        if (req.getAvatar() != null) user.setAvatar(req.getAvatar());
        try {
            userMapper.updateById(user);
        } catch (DuplicateKeyException e) {
            throw new BusinessException("该邮箱已被其他账号使用");
        }
        operationLogRecorder.log(userId, "UPDATE_PROFILE", "USER", userId, "更新个人资料");
        return UserVOMapper.toVO(user);
    }

    @Override
    public IPage<UserVO> listUsers(int page, int size, String keyword) {
        LambdaQueryWrapper<User> qw = new LambdaQueryWrapper<>();
        if (keyword != null && !keyword.isEmpty()) {
            qw.and(w -> w.like(User::getUsername, keyword).or().like(User::getRealName, keyword));
        }
        qw.orderByDesc(User::getCreatedAt);
        IPage<User> p = userMapper.selectPage(new Page<>(page, size), qw);
        return p.convert(UserVOMapper::toVO);
    }

    @Override
    public void updateStatus(Long userId, String status) {
        User user = userMapper.selectById(userId);
        if (user == null) throw new BusinessException("用户不存在");
        if (UserRole.ADMIN.getValue().equals(user.getRole())) {
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
        user.setPasswordChangedAt(LocalDateTime.now());
        userMapper.updateById(user);
        log.info("用户操作: userId={} 修改密码", userId);
        operationLogRecorder.log(userId, "CHANGE_PASSWORD", "USER", userId, "修改登录密码");
    }

    @Override
    @Transactional
    public void sendVerifyCode(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) throw new BusinessException("用户不存在");
        if (user.getEmail() == null || user.getEmail().isBlank()) {
            throw new BusinessException("请先设置邮箱");
        }
        long now = currentTimeMillis.getAsLong();
        String code = String.format("%06d", secureRandom.nextInt(1000000));
        EmailVerificationCode verificationCode = new EmailVerificationCode();
        verificationCode.setUserId(userId);
        verificationCode.setEmail(user.getEmail());
        verificationCode.setCodeHash(CodeHasher.hash(code));
        verificationCode.setSentAt(now);
        verificationCode.setExpiresAt(now + VERIFY_CODE_TTL_MS);
        verificationCode.setAttempts(0);

        int reserved = verificationCodeMapper.upsertIfCooldown(
                verificationCode, now - VERIFY_CODE_SEND_INTERVAL_MS);
        if (reserved == 0) {
            throw new BusinessException("验证码发送过于频繁，请稍后再试");
        }
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            if (mailFrom != null && !mailFrom.isBlank()) {
                msg.setFrom(mailFrom);
            }
            msg.setTo(user.getEmail());
            msg.setSubject("校园失物招领 - 邮箱验证码");
            msg.setText("您的验证码是：" + code + "，5分钟内有效。"
                    + "\n\n如无法完成验证，请访问：" + emailContentBuilder.url("/profile"));
            mailSender.send(msg);
        } catch (Exception e) {
            verificationCodeMapper.deleteMatching(userId, verificationCode.getCodeHash());
            throw new BusinessException("验证码发送失败，请检查邮箱配置");
        }
    }

    @Override
    @Transactional
    public void verifyEmail(Long userId, String code) {
        if (code == null || code.isBlank()) throw new BusinessException("验证码不能为空");
        EmailVerificationCode expected = verificationCodeMapper.selectById(userId);
        if (expected == null) {
            throw new BusinessException("验证码错误或已过期");
        }
        if (currentTimeMillis.getAsLong() > expected.getExpiresAt()) {
            verificationCodeMapper.deleteById(userId);
            throw new BusinessException("验证码错误或已过期");
        }
        int attempts = expected.getAttempts() == null ? 0 : expected.getAttempts();
        if (attempts >= VERIFY_CODE_MAX_ATTEMPTS) {
            verificationCodeMapper.deleteById(userId);
            throw new BusinessException("验证码错误次数过多，请重新发送");
        }
        User user = userMapper.selectById(userId);
        if (user == null) throw new BusinessException("用户不存在");
        if (!Objects.equals(user.getEmail(), expected.getEmail())) {
            verificationCodeMapper.deleteById(userId);
            throw new BusinessException("邮箱已变更，请重新发送验证码");
        }
        if (userMapper.exists(
                new LambdaQueryWrapper<User>()
                        .eq(User::getEmail, user.getEmail())
                        .eq(User::getEmailVerified, true)
                        .ne(User::getId, userId))) {
            verificationCodeMapper.deleteById(userId);
            throw new BusinessException("该邮箱已被其他账号验证");
        }
        if (!CodeHasher.matches(code.trim(), expected.getCodeHash())) {
            verificationCodeMapper.incrementAttempts(userId, VERIFY_CODE_MAX_ATTEMPTS);
            int remaining = VERIFY_CODE_MAX_ATTEMPTS - attempts - 1;
            if (remaining <= 0) {
                verificationCodeMapper.deleteById(userId);
                throw new BusinessException("验证码错误次数过多，请重新发送");
            }
            throw new BusinessException("验证码错误，还可尝试 " + remaining + " 次");
        }
        user.setEmailVerified(true);
        userMapper.updateById(user);
        verificationCodeMapper.deleteById(userId);
        log.info("用户操作: userId={} 邮箱验证成功", userId);
        operationLogRecorder.log(userId, "VERIFY_EMAIL", "USER", userId, "邮箱验证成功");
    }

    @Override
    public List<Map<String, Object>> searchUsers(String query) {
        List<User> users = userMapper.selectList(
                new LambdaQueryWrapper<User>()
                        .eq(User::getStatus, UserStatus.ACTIVE.getValue())
                        .and(w -> w.like(User::getUsername, query).or()
                                .like(User::getRealName, query))
                        .last("LIMIT 10"));
        return users.stream().map(user -> {
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("id", user.getId());
            result.put("username", user.getUsername());
            result.put("realName", user.getRealName());
            return result;
        }).toList();
    }

    @Override
    public Map<String, Object> getPreferences(Long userId) {
        User user = requireUser(userId);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("notifyEmail", isEnabled(user.getNotifyEmail()));
        result.put("emailVerified", isEnabled(user.getEmailVerified()));
        return result;
    }

    @Override
    public void updatePreferences(Long userId, Map<String, Object> values) {
        User user = requireUser(userId);
        if (values.containsKey("notifyEmail")) {
            boolean enabled = Boolean.TRUE.equals(values.get("notifyEmail"));
            if (enabled && !isEnabled(user.getEmailVerified())) {
                throw new BusinessException("请先验证邮箱");
            }
            user.setNotifyEmail(enabled);
            userMapper.updateById(user);
        }
    }

    @Override
    public Map<String, Object> getEmailPreferences(Long userId) {
        User user = requireUser(userId);
        UserEmailPreference preference = emailPreferenceMapper.selectById(userId);
        boolean legacy = isEnabled(user.getNotifyEmail());
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("emailVerified", isEnabled(user.getEmailVerified()));
        result.put("claim_request", preference == null ? legacy : isEnabled(preference.getClaimRequest()));
        result.put("claim_result", preference == null ? legacy : isEnabled(preference.getClaimResult()));
        result.put("announcement", preference == null ? legacy : isEnabled(preference.getAnnouncement()));
        result.put("message", preference == null ? legacy : isEnabled(preference.getMessage()));
        result.put("system_message", true);
        return result;
    }

    @Override
    public void updateEmailPreferences(Long userId, Map<String, Object> values) {
        User user = requireUser(userId);
        boolean emailVerified = isEnabled(user.getEmailVerified());
        UserEmailPreference preference = emailPreferenceMapper.selectById(userId);
        if (preference == null) {
            preference = new UserEmailPreference();
            preference.setUserId(userId);
            boolean legacy = isEnabled(user.getNotifyEmail());
            preference.setClaimRequest(legacy);
            preference.setClaimResult(legacy);
            preference.setAnnouncement(legacy);
            preference.setMessage(legacy);
            preference.setSystemMessage(true);
        }
        for (String key : List.of("claim_request", "claim_result", "announcement", "message")) {
            if (!values.containsKey(key)) {
                continue;
            }
            if (!emailVerified) {
                throw new BusinessException("请先验证邮箱后再开启邮件提醒");
            }
            boolean enabled = Boolean.TRUE.equals(values.get(key));
            switch (key) {
                case "claim_request" -> preference.setClaimRequest(enabled);
                case "claim_result" -> preference.setClaimResult(enabled);
                case "announcement" -> preference.setAnnouncement(enabled);
                case "message" -> preference.setMessage(enabled);
                default -> throw new IllegalStateException("未知邮件偏好: " + key);
            }
        }
        preference.setSystemMessage(true);
        if (emailPreferenceMapper.selectById(userId) == null) {
            emailPreferenceMapper.insert(preference);
        } else {
            emailPreferenceMapper.updateById(preference);
        }
    }

    private User requireUser(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null) {
            throw new BusinessException("用户不存在");
        }
        return user;
    }

    private boolean isEnabled(Boolean value) {
        return Boolean.TRUE.equals(value);
    }

    @Override
    public PublicProfileVO getPublicProfile(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null || !UserStatus.ACTIVE.getValue().equals(user.getStatus())) {
            throw new BusinessException("用户不存在");
        }
        Long lostCount = lostItemMapper.selectCount(
                new LambdaQueryWrapper<LostItem>().eq(LostItem::getUserId, userId));
        Long foundCount = foundItemMapper.selectCount(
                new LambdaQueryWrapper<FoundItem>().eq(FoundItem::getUserId, userId));
        Long resolvedLost = lostItemMapper.selectCount(
                new LambdaQueryWrapper<LostItem>()
                        .eq(LostItem::getUserId, userId)
                        .eq(LostItem::getStatus, LostItemStatus.FOUND.getValue()));
        Long resolvedFound = foundItemMapper.selectCount(
                new LambdaQueryWrapper<FoundItem>()
                        .eq(FoundItem::getUserId, userId)
                        .eq(FoundItem::getStatus, FoundItemStatus.CLAIMED.getValue()));
        Long pendingLost = lostItemMapper.selectCount(
                new LambdaQueryWrapper<LostItem>()
                        .eq(LostItem::getUserId, userId)
                        .eq(LostItem::getStatus, LostItemStatus.LOST.getValue()));
        Long pendingFound = foundItemMapper.selectCount(
                new LambdaQueryWrapper<FoundItem>()
                        .eq(FoundItem::getUserId, userId)
                        .eq(FoundItem::getStatus, FoundItemStatus.UNCLAIMED.getValue()));
        Long helpedLost = lostItemMapper.selectCount(
                new LambdaQueryWrapper<LostItem>()
                        .eq(LostItem::getResolvedBy, userId));
        Long helpedFound = foundItemMapper.selectCount(
                new LambdaQueryWrapper<FoundItem>()
                        .eq(FoundItem::getResolvedBy, userId));
        return PublicProfileVO.builder()
                .id(user.getId())
                .username(user.getUsername())
                .realName(user.getRealName())
                .avatar(user.getAvatar())
                .createdAt(user.getCreatedAt())
                .lostCount(lostCount != null ? lostCount.intValue() : 0)
                .foundCount(foundCount != null ? foundCount.intValue() : 0)
                .resolvedCount((resolvedLost != null ? resolvedLost.intValue() : 0)
                        + (resolvedFound != null ? resolvedFound.intValue() : 0))
                .helpedCount((helpedLost != null ? helpedLost.intValue() : 0)
                        + (helpedFound != null ? helpedFound.intValue() : 0))
                .pendingCount((pendingLost != null ? pendingLost.intValue() : 0)
                        + (pendingFound != null ? pendingFound.intValue() : 0))
                .build();
    }

    @Override
    public IPage<UserItemVO> getUserItems(Long userId, String scope, String type, int page, int size) {
        if (!List.of("published", "resolved", "helped").contains(scope)) {
            throw new BusinessException("无效的内容范围");
        }
        if (!List.of("all", "lost", "found").contains(type)) {
            throw new BusinessException("无效的内容类型");
        }
        return userItemMapper.selectUserItems(new Page<>(page, size), userId, scope, type);
    }

}
