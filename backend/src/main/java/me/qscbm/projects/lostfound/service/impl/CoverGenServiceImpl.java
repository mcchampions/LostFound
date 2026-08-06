package me.qscbm.projects.lostfound.service.impl;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import me.qscbm.projects.lostfound.common.AppHome;
import me.qscbm.projects.lostfound.common.BusinessException;
import me.qscbm.projects.lostfound.dto.CoverGenRequest;
import me.qscbm.projects.lostfound.service.CoverGenService;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.io.File;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Calls the postgen-service container over HTTP to render a text cover image,
 * then saves the returned PNG into the uploads directory.
 *
 * Rate-limited per user (sliding 60-second window, configurable).
 */
@Slf4j
@Service
public class CoverGenServiceImpl implements CoverGenService {

    private final ObjectMapper mapper = new ObjectMapper();
    private final Path uploadRoot;
    private final String postgenBaseUrl;
    private final int rateLimitPerMinute;
    private final boolean enabled;
    private final String postgenToken;
    private final ImageStorageService imageStorageService;
    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(5))
            .build();

    private final ConcurrentHashMap<Long, long[]> rateMap = new ConcurrentHashMap<>();

    private static final Set<String> ALLOWED_TEMPLATES = Set.of(
            "xhs-note", "xhs-note-green", "xhs-quote-blue", "xhs-date-note");
    public CoverGenServiceImpl(
            @Value("${app.postgen.enabled:true}") boolean enabled,
            @Value("${app.postgen.base-url:http://localhost:3000}") String baseUrl,
            @Value("${app.postgen.rate-limit-per-minute:10}") int rateLimit,
            @Value("${app.upload.path:./uploads}") String uploadPath,
            @Value("${app.postgen.token:}") String postgenToken,
            ImageStorageService imageStorageService) {
        this.enabled = enabled;
        this.postgenBaseUrl = baseUrl.endsWith("/")
                ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
        this.rateLimitPerMinute = rateLimit;
        this.postgenToken = postgenToken;
        this.imageStorageService = imageStorageService;
        if (enabled && (postgenToken == null || postgenToken.isBlank())) {
            throw new IllegalStateException("POSTGEN_TOKEN 未配置，不能启用封面生成服务");
        }
        File dir = new File(uploadPath);
        if (!dir.isAbsolute()) {
            dir = new File(AppHome.dir(), uploadPath);
        }
        this.uploadRoot = dir.toPath().toAbsolutePath().normalize();
        log.info("PostGen enabled={}, base-url={}", enabled, postgenBaseUrl);
    }

    @Override
    public String generate(Long userId, CoverGenRequest req) {
        if (!enabled) {
            throw new BusinessException("封面生成功能未启用");
        }
        if (!ALLOWED_TEMPLATES.contains(req.getTemplate())) {
            throw new BusinessException("不支持的模板: " + req.getTemplate());
        }
        if (!tryAcquire(userId)) {
            throw new BusinessException(429,
                    "已达到封面生成速率限制，请稍后再试（每分钟最多" + rateLimitPerMinute + "次）");
        }

        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("title", req.getTitle());
            String content = normalizeContent(req.getContent());
            if (!content.isBlank()) {
                payload.put("content", content);
            }
            putIfNotBlank(payload, "category", req.getCategory());
            putIfNotBlank(payload, "location", req.getLocation());
            putIfNotBlank(payload, "date", req.getDate());
            payload.put("template", req.getTemplate());

            String json = mapper.writeValueAsString(payload);
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(postgenBaseUrl + "/render"))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + postgenToken)
                    .timeout(Duration.ofSeconds(30))
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();

            HttpResponse<byte[]> response = httpClient.send(request,
                    HttpResponse.BodyHandlers.ofByteArray());

            if (response.statusCode() != 200) {
                String err = new String(response.body());
                log.error("PostGen service error ({}): {}", response.statusCode(), err);
                throw new BusinessException("封面生成失败（postgen 服务返回 " + response.statusCode() + "）");
            }

            byte[] png = response.body();
            if (png == null || png.length == 0) {
                throw new BusinessException("封面生成失败：未返回图片数据");
            }

            // Save PNG into uploads directory
            String dateDir = LocalDate.now().format(DateTimeFormatter.ofPattern("yyyy/MM/dd"));
            Path uploadDir = uploadRoot.resolve(dateDir);
            Files.createDirectories(uploadDir);
            String filename = UUID.randomUUID().toString().replace("-", "") + ".png";
            Path target = uploadDir.resolve(filename);
            Files.write(target, png);

            log.info("Cover generated for user {}: /uploads/{}/{}", userId, dateDir, filename);
            String url = "/uploads/" + dateDir + "/" + filename;
            imageStorageService.registerOwnedUrl(userId, url);
            return url;
        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("封面生成异常", e);
            throw new BusinessException("封面生成异常: " + e.getMessage());
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

    /** 每小时清理过期窗口，避免用户条目长期残留。 */
    @Scheduled(fixedRate = 3_600_000)
    public void cleanupExpiredWindows() {
        rateMap.entrySet().removeIf(entry ->
                System.currentTimeMillis() - entry.getValue()[0] > 60_000L);
    }

    private String normalizeContent(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("\r\n", "\n").replace('\r', '\n').trim();
    }

    private void putIfNotBlank(Map<String, Object> payload, String key, String value) {
        if (value != null && !value.isBlank()) {
            payload.put(key, value.trim());
        }
    }
}
