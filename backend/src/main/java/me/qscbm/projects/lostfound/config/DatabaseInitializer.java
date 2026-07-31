package me.qscbm.projects.lostfound.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.core.io.ClassPathResource;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Database auto-initialization at application startup.
 * Detects whether core tables exist; if not, executes the SQL init scripts
 * from classpath to create tables and seed data automatically.
 * <p>
 * Does NOT create the database itself — only operates on an existing database.
 * All SQL scripts are idempotent (CREATE TABLE IF NOT EXISTS, INSERT IGNORE),
 * so re-running on an initialized database is safe.
 */
@Slf4j
@Component
@Order(1)
public class DatabaseInitializer implements ApplicationRunner {

    private static final Pattern ADD_COLUMN_PATTERN = Pattern.compile(
            "(?is)^ALTER\\s+TABLE\\s+`?([\\w]+)`?\\s+ADD\\s+COLUMN\\s+`?([\\w]+)`?.*"
    );
    private static final Pattern ADD_INDEX_PATTERN = Pattern.compile(
            "(?is)^ALTER\\s+TABLE\\s+`?([\\w]+)`?\\s+ADD\\s+(?:UNIQUE\\s+)?(?:KEY|INDEX)\\s+`?([\\w]+)`?.*"
    );
    private static final Pattern ADD_CONSTRAINT_PATTERN = Pattern.compile(
            "(?is)^ALTER\\s+TABLE\\s+`?([\\w]+)`?\\s+ADD\\s+CONSTRAINT\\s+`?([\\w]+)`?.*"
    );

    private static final String[] SQL_SCRIPTS = {
            "db/init.sql",
            "db/migration_add_message.sql",
            "db/migration_add_resolver_email.sql",
            "db/migration_add_notification_related.sql",
            "db/migration_performance_integrity.sql",
            "db/migration_email_reliability.sql",
              "db/migration_message_conversation.sql",
              "db/migration_email_preference.sql",
              "db/migration_time_range.sql",
              "db/migration_password_reset.sql",
              "db/migration_security_hardening.sql"
      };

    private final JdbcTemplate jdbcTemplate;

    public DatabaseInitializer(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @Override
    public void run(ApplicationArguments args) {
        boolean existed = tablesExist();
        log.info(existed ? "数据库表已存在，执行增量迁移..." : "首次启动，执行全部初始化...");
        int totalSuccess = 0;
        int totalFailed = 0;

        for (String scriptPath : SQL_SCRIPTS) {
            try {
                int[] results = executeSqlScript(scriptPath);
                totalSuccess += results[0];
                totalFailed += results[1];
            } catch (Exception e) {
                log.error("读取 SQL 脚本失败: {}", scriptPath, e);
                totalFailed++;
            }
        }

        log.info("数据库表初始化完成 — 成功: {}, 失败: {}", totalSuccess, totalFailed);
    }

    /**
     * Check whether the core tables already exist by querying information_schema.
     */
    private boolean tablesExist() {
        try {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM information_schema.tables " +
                            "WHERE table_schema = DATABASE() AND table_name = 'user'",
                    Integer.class
            );
            return count != null && count > 0;
        } catch (Exception e) {
            log.warn("检测数据库表存在性失败，将尝试自动初始化", e);
            return false;
        }
    }

    /**
     * Read a SQL script from the classpath, split it into individual statements,
     * and execute each one against the database.
     *
     * @param scriptPath classpath-relative path to the SQL script
     * @return array of [successCount, failedCount]
     */
    private int[] executeSqlScript(String scriptPath) throws Exception {
        ClassPathResource resource = new ClassPathResource(scriptPath);
        String sql = new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);

        // 先剔除整行注释：否则注释块会与下一条语句合并成一条 SQL（中间没有分号），
        // 例如 "注释行\nALTER TABLE ..." 会被 MySQL 判定为 bad SQL grammar
        sql = stripCommentLines(sql);
        String[] statements = sql.split(";");
        int success = 0;
        int failed = 0;

        for (String stmt : statements) {
            String trimmed = stmt.trim();
            if (trimmed.isEmpty()) {
                continue;
            }
            // Skip pure comment / whitespace-only blocks
            if (trimmed.lines().allMatch(line -> {
                String l = line.trim();
                return l.isEmpty() || l.startsWith("--");
            })) {
                continue;
            }

            try {
                if (isExistingSchemaObject(trimmed)) {
                    log.debug("SQL 语句跳过 [{}]: {}...",
                            scriptPath, preview(trimmed));
                    success++;
                    continue;
                }
                jdbcTemplate.execute(trimmed);
                success++;
                log.debug("SQL 语句执行成功 [{}]: {}...",
                        scriptPath, preview(trimmed));
            } catch (Exception e) {
                failed++;
                log.error("SQL 语句执行失败 [{}]: {}... — {}",
                        scriptPath, preview(trimmed), e.getMessage());
            }
        }

        return new int[]{success, failed};
    }

    /**
     * 移除所有整行注释（trim 后以 "--" 开头）与空行。
     * 只处理整行注释，不影响 SQL 语句中字符串字面量（如 VALUES ('--xx')）。
     */
    static String stripCommentLines(String sql) {
        StringBuilder cleaned = new StringBuilder(sql.length());
        for (String line : sql.split("\n", -1)) {
            String trimmed = line.trim();
            if (trimmed.isEmpty() || trimmed.startsWith("--")) {
                continue;
            }
            cleaned.append(line).append('\n');
        }
        return cleaned.toString();
    }

    /**
     * Makes simple ADD COLUMN migrations repeatable without relying on
     * database-version-specific IF NOT EXISTS syntax.
     */
    private boolean isExistingSchemaObject(String sql) {
        Matcher matcher = ADD_COLUMN_PATTERN.matcher(sql);
        if (matcher.matches()) {
            return existsInInformationSchema(
                    "information_schema.columns", "table_name", matcher.group(1),
                    "column_name", matcher.group(2));
        }

        matcher = ADD_INDEX_PATTERN.matcher(sql);
        if (matcher.matches()) {
            return existsInInformationSchema(
                    "information_schema.statistics", "table_name", matcher.group(1),
                    "index_name", matcher.group(2));
        }

        matcher = ADD_CONSTRAINT_PATTERN.matcher(sql);
        if (matcher.matches()) {
            return existsInInformationSchema(
                    "information_schema.table_constraints", "table_name", matcher.group(1),
                    "constraint_name", matcher.group(2));
        }
        return false;
    }

    private boolean existsInInformationSchema(
            String schemaTable,
            String tableColumn,
            String tableName,
            String objectColumn,
            String objectName) {
        Integer count = jdbcTemplate.queryForObject(
                "SELECT COUNT(*) FROM " + schemaTable +
                        " WHERE table_schema = DATABASE() AND " + tableColumn + " = ? AND " + objectColumn + " = ?",
                Integer.class,
                tableName,
                objectName
        );
        return count != null && count > 0;
    }

    /**
     * Truncate a SQL statement to a brief preview for logging.
     */
    private String preview(String sql) {
        String singleLine = sql.replace('\n', ' ').replace('\r', ' ').trim();
        return singleLine.length() > 60 ? singleLine.substring(0, 60) + "..." : singleLine;
    }
}
