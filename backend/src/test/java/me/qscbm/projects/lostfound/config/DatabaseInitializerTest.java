package me.qscbm.projects.lostfound.config;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class DatabaseInitializerTest {

    @Test
    void stripsLeadingCommentsBeforeFirstStatement() {
        String sql = """
                -- Migration: add columns
                -- second comment line

                ALTER TABLE `lost_item` ADD COLUMN `lost_time_end` DATETIME;
                """;

        String stripped = DatabaseInitializer.stripCommentLines(sql);

        assertThat(stripped).doesNotContain("--");
        assertThat(stripped.trim()).startsWith("ALTER TABLE");
    }

    @Test
    void stripsCommentBlocksBetweenStatements() {
        String sql = """
                ALTER TABLE `a` ADD COLUMN `x` INT;
                -- note between statements
                ALTER TABLE `b` ADD COLUMN `y` INT;
                """;

        String stripped = DatabaseInitializer.stripCommentLines(sql);

        assertThat(stripped).contains("ALTER TABLE `a`").contains("ALTER TABLE `b`");
        assertThat(stripped).doesNotContain("-- note");
    }

    @Test
    void keepsCommentLikeTextInsideStringLiteral() {
        String sql = "INSERT INTO `t` (`v`) VALUES ('-- not a comment');\n";

        String stripped = DatabaseInitializer.stripCommentLines(sql);

        assertThat(stripped).contains("'-- not a comment'");
    }
}
