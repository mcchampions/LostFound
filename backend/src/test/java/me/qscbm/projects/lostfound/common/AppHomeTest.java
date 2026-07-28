package me.qscbm.projects.lostfound.common;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.File;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class AppHomeTest {

    @TempDir
    Path tempDir;

    @Test
    void usesConfiguredAppHomeFirst() {
        Path configured = tempDir.resolve("configured-home");

        File result = AppHome.resolveHome(
                configured.toString(),
                tempDir.resolve("app.jar").toString(),
                File.pathSeparator,
                null,
                tempDir.resolve("working").toString()
        );

        assertThat(result.toPath()).isEqualTo(configured.toAbsolutePath().normalize());
    }

    @Test
    void resolvesHomeFromStandaloneJarClasspath() {
        Path jar = tempDir.resolve("deployment").resolve("lost-found.jar");

        File result = AppHome.resolveHome(
                null,
                jar.toString(),
                File.pathSeparator,
                null,
                tempDir.resolve("working").toString()
        );

        assertThat(result.toPath()).isEqualTo(jar.getParent().toAbsolutePath().normalize());
    }

    @Test
    void resolvesSpringBootNestedJarLocation() {
        Path jar = tempDir.resolve("deployment").resolve("lost-found.jar");
        String nestedLocation = "jar:nested:" + jar.toUri() + "/!BOOT-INF/classes/!/";

        File result = AppHome.resolveHome(
                null,
                "classes;dependency.jar",
                ";",
                nestedLocation,
                tempDir.resolve("working").toString()
        );

        assertThat(result.toPath()).isEqualTo(jar.getParent().toAbsolutePath().normalize());
    }

    @Test
    void fallsBackToWorkingDirectoryDuringDevelopment() {
        Path working = tempDir.resolve("working");

        File result = AppHome.resolveHome(
                null,
                "target/classes;dependency.jar",
                ";",
                "file:/project/target/classes/",
                working.toString()
        );

        assertThat(result.toPath()).isEqualTo(working.toAbsolutePath().normalize());
    }
}
