package me.qscbm.projects.lostfound;

import me.qscbm.projects.lostfound.common.AppHome;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.time.LocalDate;
import java.util.Map;

@SpringBootApplication
@MapperScan("me.qscbm.projects.lostfound.mapper")
public class LostFoundApplication {

    public static void main(String[] args) {
        File home = AppHome.dir();
        extractDefaultConfig(home);
        prepareLogFile(home);

        SpringApplication application = new SpringApplication(LostFoundApplication.class);
        // 以 jar 同目录下的 config/ 外部配置为主（存在时覆盖 classpath 内的 application.yml）
        File configDir = new File(home, "config");
        if (configDir.isDirectory()) {
            String location = configDir.toURI().toString();
            if (!location.endsWith("/")) {
                location += "/";
            }
            application.setDefaultProperties(Map.of("spring.config.additional-location", location));
            System.out.println("[config] 使用外部配置目录: " + configDir.getAbsolutePath());
        } else {
            System.out.println("[config] 外部配置目录不存在（检查路径: "
                    + configDir.getAbsolutePath() + "），本次使用 jar 内置配置");
        }
        application.run(args);
    }

    /**
     * 从 jar 运行时，把内置 application.yml 提取到 jar 同目录 config/ 下作为模板；
     * 已存在则不动，外部文件优先级高于内置。
     */
    private static void extractDefaultConfig(File home) {
        if (!isRunningFromJar()) {
            return;
        }
        File configDir = new File(home, "config");
        File target = new File(configDir, "application.yml");
        if (target.exists()) {
            return;
        }
        try {
            Files.createDirectories(configDir.toPath());
            try (InputStream in = LostFoundApplication.class.getResourceAsStream("/application.yml")) {
                if (in != null) {
                    Files.copy(in, target.toPath());
                    System.out.println("[config] 已提取默认配置模板: " + target.getAbsolutePath());
                }
            }
        } catch (IOException e) {
            System.err.println("[config] 创建外部配置目录失败: " + configDir.getAbsolutePath()
                    + " (" + e.getMessage() + ")");
        }
    }

    /**
     * 日志写入本地文件：jar 同目录 logs/ 下，文件名为「日期-第几次启动.log」，
     * 如 logs/2026-08-02-1.log。通过系统属性 LOG_FILE_NAME 交给 logback。
     */
    static void prepareLogFile(File home) {
        try {
            File logsDir = new File(home, "logs");
            Files.createDirectories(logsDir.toPath());
            String today = LocalDate.now().toString();
            int sequence;
            try (var stream = Files.list(logsDir.toPath())) {
                sequence = (int) stream
                        .filter(path -> path.getFileName().toString().matches(today + "-\\d+\\.log"))
                        .count() + 1;
            }
            String fileName = new File(logsDir, today + "-" + sequence + ".log").getAbsolutePath();
            System.setProperty("LOG_FILE_NAME", fileName);
            System.out.println("[log] 日志文件: " + fileName);
        } catch (IOException e) {
            System.err.println("[log] 初始化日志文件失败: " + e.getMessage());
        }
    }

    private static boolean isRunningFromJar() {
        try {
            String classPath = System.getProperty("java.class.path", "");
            if (classPath.toLowerCase().endsWith(".jar")) {
                return true;
            }
            String location = LostFoundApplication.class
                    .getProtectionDomain().getCodeSource().getLocation().toString();
            String lower = location.toLowerCase();
            return lower.endsWith(".jar")
                    || lower.startsWith("jar:")
                    || lower.startsWith("nested:")
                    || lower.contains(".jar!/")
                    || lower.contains(".jar/!");
        } catch (Exception e) {
            return false;
        }
    }
}
