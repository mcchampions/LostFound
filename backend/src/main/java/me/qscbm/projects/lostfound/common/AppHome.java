package me.qscbm.projects.lostfound.common;

import java.io.File;
import java.net.URI;
import java.nio.file.Path;
import java.util.Locale;
import java.util.regex.Pattern;

public final class AppHome {

    private AppHome() {}

    public static File dir() {
        String codeSource = null;
        try {
            codeSource = AppHome.class.getProtectionDomain()
                    .getCodeSource().getLocation().toString();
        } catch (Exception ignored) {
        }
        return resolveHome(
                System.getProperty("app.home"),
                System.getProperty("java.class.path"),
                System.getProperty("path.separator", File.pathSeparator),
                codeSource,
                System.getProperty("user.dir")
        );
    }

    static File resolveHome(String configuredHome,
                            String classPath,
                            String pathSeparator,
                            String codeSource,
                            String userDir) {
        if (configuredHome != null && !configuredHome.isBlank()) {
            return normalized(configuredHome);
        }

        File classPathJar = standaloneJarHome(classPath, pathSeparator);
        if (classPathJar != null) {
            return classPathJar;
        }

        File codeSourceJar = codeSourceJarHome(codeSource);
        if (codeSourceJar != null) {
            return codeSourceJar;
        }

        return normalized(userDir);
    }

    private static File standaloneJarHome(String classPath, String pathSeparator) {
        if (classPath == null || classPath.isBlank()) {
            return null;
        }
        String[] entries = classPath.split(Pattern.quote(pathSeparator));
        if (entries.length != 1 || !entries[0].toLowerCase(Locale.ROOT).endsWith(".jar")) {
            return null;
        }
        Path jar = Path.of(entries[0]).toAbsolutePath().normalize();
        Path parent = jar.getParent();
        return parent != null ? parent.toFile() : null;
    }

    private static File codeSourceJarHome(String codeSource) {
        if (codeSource == null || codeSource.isBlank()) {
            return null;
        }
        int jarEnd = codeSource.toLowerCase(Locale.ROOT).indexOf(".jar");
        if (jarEnd < 0) {
            return null;
        }

        String jarLocation = codeSource.substring(0, jarEnd + 4);
        while (jarLocation.startsWith("jar:") || jarLocation.startsWith("nested:")) {
            jarLocation = jarLocation.substring(jarLocation.indexOf(':') + 1);
        }

        try {
            Path jar = jarLocation.startsWith("file:")
                    ? Path.of(new URI(jarLocation))
                    : Path.of(jarLocation);
            Path parent = jar.toAbsolutePath().normalize().getParent();
            return parent != null ? parent.toFile() : null;
        } catch (Exception ignored) {
            return null;
        }
    }

    private static File normalized(String path) {
        String value = path == null || path.isBlank() ? "." : path;
        return Path.of(value).toAbsolutePath().normalize().toFile();
    }
}
