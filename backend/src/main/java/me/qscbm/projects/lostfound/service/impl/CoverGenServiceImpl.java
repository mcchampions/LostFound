package me.qscbm.projects.lostfound.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import me.qscbm.projects.lostfound.common.AppHome;
import me.qscbm.projects.lostfound.common.BusinessException;
import me.qscbm.projects.lostfound.dto.CoverGenRequest;
import me.qscbm.projects.lostfound.service.CoverGenService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/**
 * Calls the postgen2 Node CLI (satori + resvg) via ProcessBuilder to render
 * a Xiaohongshu-style text cover image, then moves the PNG into the uploads
 * directory so it is served like any other uploaded image.
 *
 * Rate-limited per user (sliding 60-second window, configurable).
 */
@Slf4j
@Service
public class CoverGenServiceImpl implements CoverGenService {

    private final ObjectMapper mapper = new ObjectMapper();
    private final Path workDir;
    private final Path uploadRoot;
    private final String nodeBin;
    private final String cliPath;
    private final String fontRegular;
    private final String fontBold;
    private final int rateLimitPerMinute;
    private final boolean enabled;

    private final ConcurrentHashMap<Long, long[]> rateMap = new ConcurrentHashMap<>();

    private static final Set<String> ALLOWED_TEMPLATES = Set.of(
            "xhs-note", "xhs-note-green", "xhs-quote-blue", "xhs-date-note");
    private static final Set<String> ALLOWED_THEMES = Set.of("cream", "blue", "green");

    public CoverGenServiceImpl(
            @Value("${app.postgen.enabled:true}") boolean enabled,
            @Value("${app.postgen.node-bin:node}") String nodeBin,
            @Value("${app.postgen.cli-path:../web-frontend/node_modules/postgen2/dist/cli.js}") String cliPath,
            @Value("${app.postgen.font-regular:../web-frontend/node_modules/postgen2/fonts/custom/LXGWWenKaiLite-Regular.ttf}") String fontRegular,
            @Value("${app.postgen.font-bold:../web-frontend/node_modules/postgen2/fonts/custom/LXGWMarkerGothic-Regular.ttf}") String fontBold,
            @Value("${app.postgen.work-dir:./postgen-work}") String workDir,
            @Value("${app.postgen.rate-limit-per-minute:10}") int rateLimit,
            @Value("${app.upload.path:./uploads}") String uploadPath) {
        this.enabled = enabled;
        this.nodeBin = nodeBin;
        this.cliPath = cliPath;
        this.fontRegular = fontRegular;
        this.fontBold = fontBold;
        this.rateLimitPerMinute = rateLimit;
        File base = AppHome.dir();
        this.workDir = resolvePath(workDir, base);
        this.uploadRoot = resolvePath(uploadPath, base);
        log.info("PostGen enabled={}, node={}, cli={}", enabled, nodeBin, cliPath);
    }

    private Path resolvePath(String p, File base) {
        File f = new File(p);
        if (!f.isAbsolute()) {
            f = new File(base, p);
        }
        return f.toPath().toAbsolutePath().normalize();
    }

    @Override
    public String generate(Long userId, CoverGenRequest req) {
        if (!enabled) {
            throw new BusinessException("封面生成功能未启用");
        }
        if (!ALLOWED_TEMPLATES.contains(req.getTemplate())) {
            throw new BusinessException("不支持的模板: " + req.getTemplate());
        }
        if (req.getTheme() != null && !req.getTheme().isBlank()
                && !ALLOWED_THEMES.contains(req.getTheme())) {
            throw new BusinessException("不支持的主题配色: " + req.getTheme());
        }
        if (!tryAcquire(userId)) {
            throw new BusinessException("操作过于频繁，请稍后再试（每分钟限" + rateLimitPerMinute + "次）");
        }

        Path jsonFile = null;
        Path pngFile = null;
        try {
            Files.createDirectories(workDir);
            String stamp = UUID.randomUUID().toString().replace("-", "");
            jsonFile = workDir.resolve("cover-" + stamp + ".json");
            pngFile = workDir.resolve("cover-" + stamp + ".png");

            Map<String, Object> data = new LinkedHashMap<>();
            data.put("title", req.getTitle());
            if (req.getSubtitle() != null && !req.getSubtitle().isBlank()) {
                data.put("subtitle", req.getSubtitle());
            }
            if (req.getTheme() != null && !req.getTheme().isBlank()) {
                data.put("theme", req.getTheme());
            }
            mapper.writerWithDefaultPrettyPrinter().writeValue(jsonFile.toFile(), data);

            List<String> cmd = new ArrayList<>();
            cmd.add(nodeBin);
            cmd.add(cliPath);
            cmd.add("render");
            cmd.add("--template");
            cmd.add(req.getTemplate());
            cmd.add("--data");
            cmd.add(jsonFile.toString());
            cmd.add("--out");
            cmd.add(pngFile.toString());
            cmd.add("--font");
            cmd.add(fontRegular);
            cmd.add("--fontBold");
            cmd.add(fontBold);
            cmd.add("--title-layout-mode");
            cmd.add("rule");

            ProcessBuilder pb = new ProcessBuilder(cmd);
            pb.redirectErrorStream(true);
            pb.directory(AppHome.dir());
            Process proc = pb.start();
            String output = new String(proc.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
            boolean finished = proc.waitFor(30, TimeUnit.SECONDS);
            if (!finished) {
                proc.destroyForcibly();
                throw new BusinessException("封面生成超时，请重试");
            }
            int exit = proc.exitValue();
            if (exit != 0) {
                log.error("PostGen render failed (exit={}): {}", exit, output);
                throw new BusinessException("封面生成失败");
            }
            if (!Files.exists(pngFile)) {
                log.error("PostGen produced no output. stdout: {}", output);
                throw new BusinessException("封面生成失败：未输出图片");
            }

            // Move PNG into uploads directory (same as uploaded images)
            String dateDir = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy/MM/dd"));
            Path uploadDir = uploadRoot.resolve(dateDir);
            Files.createDirectories(uploadDir);
            String filename = UUID.randomUUID().toString().replace("-", "") + ".png";
            Path target = uploadDir.resolve(filename);
            Files.move(pngFile, target, StandardCopyOption.REPLACE_EXISTING);

            log.info("Cover generated for user {}: /uploads/{}/{}", userId, dateDir, filename);
            return "/uploads/" + dateDir + "/" + filename;
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("封面生成异常", e);
            throw new BusinessException("封面生成异常: " + e.getMessage());
        } finally {
            if (jsonFile != null) {
                try { Files.deleteIfExists(jsonFile); } catch (Exception ignored) {}
            }
            if (pngFile != null) {
                try { Files.deleteIfExists(pngFile); } catch (Exception ignored) {}
            }
        }
    }

    private boolean tryAcquire(Long userId) {
        long now = System.currentTimeMillis();
        long[] window = rateMap.compute(userId, (k, v) -> {
            if (v == null || now - v[0] > 60_000L) {
                return new long[]{now, 1};
            }
            v[1]++;
            return v;
        });
        return window[1] <= rateLimitPerMinute;
    }
}
