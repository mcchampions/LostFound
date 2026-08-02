package me.qscbm.projects.lostfound.common;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.HexFormat;

/**
 * 验证码哈希工具：SHA-256 + 随机盐（"盐:摘要" 存储）。
 * 6 位数字验证码无需 BCrypt 的高成本，哈希即可满足防泄露要求。
 */
public final class CodeHasher {

    private static final SecureRandom RANDOM = new SecureRandom();

    private CodeHasher() {
    }

    public static String hash(String code) {
        byte[] salt = new byte[8];
        RANDOM.nextBytes(salt);
        String saltHex = HexFormat.of().formatHex(salt);
        return saltHex + ":" + sha256Hex(saltHex + ":" + code);
    }

    public static boolean matches(String code, String stored) {
        if (code == null || stored == null) {
            return false;
        }
        int separator = stored.indexOf(':');
        if (separator <= 0) {
            return false;
        }
        String salt = stored.substring(0, separator);
        String expected = stored.substring(separator + 1);
        return sha256Hex(salt + ":" + code).equals(expected);
    }

    private static String sha256Hex(String input) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(input.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 不可用", e);
        }
    }
}
