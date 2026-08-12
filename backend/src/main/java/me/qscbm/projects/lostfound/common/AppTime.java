package me.qscbm.projects.lostfound.common;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;

/**
 * 统一的应用时间基准。
 * <p>
 * 数据库连接串使用 {@code serverTimezone=Asia/Shanghai}，所有写入 DATETIME 列
 * 的业务时间戳都应使用同一个时区，避免服务器系统时区与数据库时区不一致时
 * 出现“改密后旧 token 未失效”“时间范围校验错位”等问题。
 * <p>
 * 可通过系统属性 {@code -Dapp.timezone=Asia/Shanghai} 覆盖（默认 Asia/Shanghai），
 * 覆盖时必须与 JDBC 的 {@code serverTimezone} 保持一致。
 */
public final class AppTime {

    private static final String DEFAULT_ZONE_ID = "Asia/Shanghai";

    private static final ZoneId ZONE = resolveZone();

    private AppTime() {
    }

    public static ZoneId zone() {
        return ZONE;
    }

    public static LocalDateTime now() {
        return LocalDateTime.now(ZONE);
    }

    public static LocalDate today() {
        return LocalDate.now(ZONE);
    }

    private static ZoneId resolveZone() {
        String configured = System.getProperty("app.timezone", DEFAULT_ZONE_ID);
        try {
            return ZoneId.of(configured);
        } catch (Exception e) {
            return ZoneId.of(DEFAULT_ZONE_ID);
        }
    }
}
