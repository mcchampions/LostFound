package me.qscbm.projects.lostfound.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.LambdaQueryWrapper;
import com.baomidou.mybatisplus.core.metadata.IPage;
import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import me.qscbm.projects.lostfound.common.BusinessException;
import me.qscbm.projects.lostfound.common.EmailNormalizer;
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
import me.qscbm.projects.lostfound.mapper.EmailVerificationCodeMapper;
import me.qscbm.projects.lostfound.mapper.FoundItemMapper;
import me.qscbm.projects.lostfound.mapper.LostItemMapper;
import me.qscbm.projects.lostfound.mapper.UserEmailPreferenceMapper;
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
import java.util.stream.Collectors;

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
                           OperationLogRecorder operationLogRecorder,
                           EmailContentBuilder emailContentBuilder) {
        this(userMapper, passwordEncoder, mailSender, verificationCodeMapper,
             lostItemMapper, foundItemMapper, emailPreferenceMapper, operationLogRecorder,
             emailContentBuilder, System::currentTimeMillis);
    }

    UserServiceImpl(UserMapper userMapper,
                    PasswordEncoder passwordEncoder,
                    JavaMailSender mailSender,
                    EmailVerificationCodeMapper verificationCodeMapper,
                    LostItemMapper lostItemMapper,
                    FoundItemMapper foundItemMapper,
                    UserEmailPreferenceMapper emailPreferenceMapper,
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
        this.operationLogRecorder = operationLogRecorder;
        this.emailContentBuilder = emailContentBuilder;
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
            String newEmail = EmailNormalizer.normalize(req.getEmail());
            if (!Objects.equals(user.getEmail(), newEmail)) {
                if (newEmail != null && userMapper.exists(
                        new LambdaQueryWrapper<User>()
                                .eq(User::getEmail, newEmail)
                                .ne(User::getId, userId))) {
                    throw new BusinessException("该邮箱已被其他账号使用");
                }
                user.setEmailVerified(0);
                user.setNotifyEmail(0);
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
        verificationCode.setCodeHash(passwordEncoder.encode(code));
        verificationCode.setSentAt(now);
        verificationCode.setExpiresAt(now + VERIFY_CODE_TTL_MS);
        verificationCode.setAttempts(0);

        int updated = verificationCodeMapper.updateIfCooldown(
                verificationCode, now - VERIFY_CODE_SEND_INTERVAL_MS);
        if (updated == 0) {
            try {
                verificationCodeMapper.insert(verificationCode);
            } catch (DuplicateKeyException e) {
                throw new BusinessException("验证码发送过于频繁，请稍后再试");
            }
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
                        .eq(User::getEmailVerified, 1)
                        .ne(User::getId, userId))) {
            verificationCodeMapper.deleteById(userId);
            throw new BusinessException("该邮箱已被其他账号验证");
        }
        if (!passwordEncoder.matches(code.trim(), expected.getCodeHash())) {
            verificationCodeMapper.incrementAttempts(userId, VERIFY_CODE_MAX_ATTEMPTS);
            int remaining = VERIFY_CODE_MAX_ATTEMPTS - attempts - 1;
            if (remaining <= 0) {
                verificationCodeMapper.deleteById(userId);
                throw new BusinessException("验证码错误次数过多，请重新发送");
            }
            throw new BusinessException("验证码错误，还可尝试 " + remaining + " 次");
        }
        user.setEmailVerified(1);
        userMapper.updateById(user);
        verificationCodeMapper.deleteById(userId);
        log.info("用户操作: userId={} 邮箱验证成功", userId);
        operationLogRecorder.log(userId, "VERIFY_EMAIL", "USER", userId, "邮箱验证成功");
    }

    @Override
    public PublicProfileVO getPublicProfile(Long userId) {
        User user = userMapper.selectById(userId);
        if (user == null || !"ACTIVE".equals(user.getStatus())) {
            throw new BusinessException("用户不存在");
        }
        Long lostCount = lostItemMapper.selectCount(
                new LambdaQueryWrapper<LostItem>().eq(LostItem::getUserId, userId));
        Long foundCount = foundItemMapper.selectCount(
                new LambdaQueryWrapper<FoundItem>().eq(FoundItem::getUserId, userId));
        Long resolvedLost = lostItemMapper.selectCount(
                new LambdaQueryWrapper<LostItem>()
                        .eq(LostItem::getUserId, userId)
                        .eq(LostItem::getStatus, "FOUND"));
        Long resolvedFound = foundItemMapper.selectCount(
                new LambdaQueryWrapper<FoundItem>()
                        .eq(FoundItem::getUserId, userId)
                        .eq(FoundItem::getStatus, "CLAIMED"));
        Long pendingLost = lostItemMapper.selectCount(
                new LambdaQueryWrapper<LostItem>()
                        .eq(LostItem::getUserId, userId)
                        .eq(LostItem::getStatus, "LOST"));
        Long pendingFound = foundItemMapper.selectCount(
                new LambdaQueryWrapper<FoundItem>()
                        .eq(FoundItem::getUserId, userId)
                        .eq(FoundItem::getStatus, "UNCLAIMED"));
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
        boolean includeLost = "all".equals(type) || "lost".equals(type);
        boolean includeFound = "all".equals(type) || "found".equals(type);
        boolean resolvedOnly = "resolved".equals(scope);
        boolean helpedOnly = "helped".equals(scope);

        List<UserItemVO> allItems = new ArrayList<>();

        if (includeLost) {
            LambdaQueryWrapper<LostItem> qw = new LambdaQueryWrapper<>();
            if (helpedOnly) {
                qw.eq(LostItem::getResolvedBy, userId);
            } else {
                qw.eq(LostItem::getUserId, userId);
                if (resolvedOnly) {
                    qw.eq(LostItem::getStatus, "FOUND");
                }
            }
            qw.orderByDesc(LostItem::getCreatedAt);
            List<LostItem> lostItems = lostItemMapper.selectList(qw);
            allItems.addAll(lostItems.stream().map(item -> UserItemVO.builder()
                    .id(item.getId())
                    .userId(item.getUserId())
                    .itemType("LOST")
                    .title(item.getTitle())
                    .status(item.getStatus())
                    .coverImage(item.getCoverImage())
                    .location(item.getLocation())
                    .createdAt(item.getCreatedAt())
                    .eventTime(item.getLostTime())
                    .eventTimeEnd(item.getLostTimeEnd())
                    .resolvedType(item.getResolvedType())
                    .resolvedBy(item.getResolvedBy())
                    .resolvedNote(item.getResolvedNote())
                    .build()).toList());
        }

        if (includeFound) {
            LambdaQueryWrapper<FoundItem> qw = new LambdaQueryWrapper<>();
            if (helpedOnly) {
                qw.eq(FoundItem::getResolvedBy, userId);
            } else {
                qw.eq(FoundItem::getUserId, userId);
                if (resolvedOnly) {
                    qw.eq(FoundItem::getStatus, "CLAIMED");
                }
            }
            qw.orderByDesc(FoundItem::getCreatedAt);
            List<FoundItem> foundItems = foundItemMapper.selectList(qw);
            allItems.addAll(foundItems.stream().map(item -> UserItemVO.builder()
                    .id(item.getId())
                    .userId(item.getUserId())
                    .itemType("FOUND")
                    .title(item.getTitle())
                    .status(item.getStatus())
                    .coverImage(item.getCoverImage())
                    .location(item.getLocation())
                    .createdAt(item.getCreatedAt())
                    .eventTime(item.getFoundTime())
                    .eventTimeEnd(item.getFoundTimeEnd())
                    .resolvedType(item.getResolvedType())
                    .resolvedBy(item.getResolvedBy())
                    .resolvedNote(item.getResolvedNote())
                    .build()).toList());
        }

        // Sort by createdAt desc and apply manual pagination
        allItems.sort((a, b) -> {
            if (a.getCreatedAt() == null) return 1;
            if (b.getCreatedAt() == null) return -1;
            return b.getCreatedAt().compareTo(a.getCreatedAt());
        });

        // Batch load resolver names for resolved items
        Set<Long> resolverIds = allItems.stream()
                .map(UserItemVO::getResolvedBy)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, User> resolvers = resolverIds.isEmpty() ? Collections.emptyMap()
                : userMapper.selectBatchIds(resolverIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
        allItems.forEach(item -> {
            if (item.getResolvedBy() != null) {
                User resolver = resolvers.get(item.getResolvedBy());
                item.setResolvedByName(resolver != null
                        ? (resolver.getRealName() != null ? resolver.getRealName() : resolver.getUsername())
                        : "用户已不可用");
            }
        });

        // Batch load publisher names
        Set<Long> publisherIds = allItems.stream()
                .map(UserItemVO::getUserId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Map<Long, User> publishers = publisherIds.isEmpty() ? Collections.emptyMap()
                : userMapper.selectBatchIds(publisherIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));
        allItems.forEach(item -> {
            if (item.getUserId() != null) {
                User publisher = publishers.get(item.getUserId());
                item.setPublisherName(publisher != null
                        ? (publisher.getRealName() != null ? publisher.getRealName() : publisher.getUsername())
                        : "用户已不可用");
            }
        });

        int total = allItems.size();
        int fromIndex = Math.min((page - 1) * size, total);
        int toIndex = Math.min(fromIndex + size, total);
        List<UserItemVO> pageRecords = allItems.subList(fromIndex, toIndex);

        Page<UserItemVO> result = new Page<>(page, size, total);
        result.setRecords(pageRecords);
        return result;
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
