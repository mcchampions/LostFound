package me.qscbm.projects.lostfound.controller;

import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import me.qscbm.projects.lostfound.common.AppHome;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.imageio.ImageIO;
import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * Serves uploaded files with a built-in fallback: when the requested file
 * does not exist (e.g. cleaned up by the server), a generated placeholder
 * PNG is returned instead of a 404, so the frontend always gets an image.
 */
@Slf4j
@RestController
public class FileController {

    private final Path uploadRoot;
    private volatile byte[] placeholderPng;

    public FileController(@Value("${app.upload.path:./uploads}") String uploadPath) {
        File dir = new File(uploadPath);
        if (!dir.isAbsolute()) {
            dir = new File(AppHome.dir(), uploadPath);
        }
        this.uploadRoot = dir.toPath().toAbsolutePath().normalize();
        log.info("FileController upload root: {}", uploadRoot);
    }

    @GetMapping("/uploads/**")
    public ResponseEntity<Resource> serve(HttpServletRequest request) {
        String relative = request.getRequestURI().substring("/uploads/".length());
        relative = URLDecoder.decode(relative, StandardCharsets.UTF_8);
        Path file = uploadRoot.resolve(relative).normalize();
        if (file.startsWith(uploadRoot) && Files.isRegularFile(file)) {
            return ResponseEntity.ok()
                    .contentType(guessMediaType(file))
                    .header(HttpHeaders.CACHE_CONTROL, "max-age=86400")
                    .body(new FileSystemResource(file));
        }
        return ResponseEntity.ok()
                .contentType(MediaType.IMAGE_PNG)
                .header(HttpHeaders.CACHE_CONTROL, "no-cache")
                .body(new ByteArrayResource(getPlaceholder()));
    }

    private MediaType guessMediaType(Path file) {
        String name = file.getFileName().toString().toLowerCase();
        if (name.endsWith(".jpg") || name.endsWith(".jpeg")) return MediaType.IMAGE_JPEG;
        if (name.endsWith(".png")) return MediaType.IMAGE_PNG;
        if (name.endsWith(".gif")) return MediaType.IMAGE_GIF;
        if (name.endsWith(".webp")) return MediaType.parseMediaType("image/webp");
        return MediaType.APPLICATION_OCTET_STREAM;
    }

    private byte[] getPlaceholder() {
        if (placeholderPng == null) {
            synchronized (this) {
                if (placeholderPng == null) {
                    placeholderPng = generatePlaceholder();
                }
            }
        }
        return placeholderPng;
    }

    private byte[] generatePlaceholder() {
        int w = 480, h = 270;
        BufferedImage img = new BufferedImage(w, h, BufferedImage.TYPE_INT_RGB);
        Graphics2D g = img.createGraphics();
        try {
            g.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);
            g.setColor(new Color(0xF0, 0xF0, 0xF0));
            g.fillRect(0, 0, w, h);
            g.setColor(new Color(0xBD, 0xBD, 0xBD));
            g.setStroke(new BasicStroke(3));
            int ix = w / 2 - 40, iy = h / 2 - 30, iw = 80, ih = 60;
            g.drawRect(ix, iy, iw, ih);
            g.fillPolygon(new int[]{ix + 12, ix + 30, ix + 48}, new int[]{iy + ih - 12, iy + 20, iy + ih - 12}, 3);
            g.fillOval(ix + 55, iy + 10, 16, 16);
            g.setColor(new Color(0x9E, 0x9E, 0x9E));
            g.setFont(new Font(Font.SANS_SERIF, Font.PLAIN, 18));
            FontMetrics fm = g.getFontMetrics();
            String text = "No Image";
            g.drawString(text, (w - fm.stringWidth(text)) / 2, iy + ih + 28);
        } finally {
            g.dispose();
        }
        try (ByteArrayOutputStream bos = new ByteArrayOutputStream()) {
            ImageIO.write(img, "png", bos);
            return bos.toByteArray();
        } catch (IOException e) {
            log.warn("生成占位图失败", e);
            return new byte[0];
        }
    }
}
