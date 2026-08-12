package me.qscbm.projects.lostfound.controller;

import lombok.extern.slf4j.Slf4j;
import me.qscbm.projects.lostfound.common.AppTime;
import me.qscbm.projects.lostfound.common.AppHome;
import me.qscbm.projects.lostfound.common.Result;
import me.qscbm.projects.lostfound.service.impl.ImageStorageService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import javax.imageio.ImageReadParam;
import javax.imageio.ImageReader;
import javax.imageio.stream.ImageInputStream;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.format.DateTimeFormatter;
import java.util.Iterator;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Semaphore;
import java.util.concurrent.TimeUnit;

@Slf4j
@RestController
@RequestMapping("/api/v1")
public class UploadController {

    private final Path uploadRoot;
    private final ImageStorageService imageStorageService;

    private static final long MAX_IMAGE_SIZE = 5L * 1024 * 1024;
    private static final long MAX_PIXELS = 12_000_000L;
    private static final int UPLOAD_MAX_LONG_SIDE = 1080;
    /** 图片解码/压缩并发上限，防止大图同时解码撑爆堆内存。 */
    private static final Semaphore PROCESSING_SLOTS = new Semaphore(4);
    private static final long PROCESSING_WAIT_SECONDS = 10;

    public UploadController(@Value("${app.upload.path:./uploads}") String uploadPath) {
        this(uploadPath, null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public UploadController(@Value("${app.upload.path:./uploads}") String uploadPath,
                            ImageStorageService imageStorageService) {
        File dir = new File(uploadPath);
        if (!dir.isAbsolute()) {
            dir = new File(AppHome.dir(), uploadPath);
        }
        this.uploadRoot = dir.toPath().toAbsolutePath().normalize();
        this.imageStorageService = imageStorageService;
        log.info("Upload directory: {}", uploadRoot);
    }

    @PostMapping("/upload/image")
    public Result<Map<String, String>> upload(@AuthenticationPrincipal Long userId,
                                              @RequestParam("file") MultipartFile file) throws IOException {
        if (userId == null) {
            return Result.error("请先登录后再上传图片");
        }
        return store(userId, file);
    }

    private Result<Map<String, String>> store(Long userId, MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            return Result.error("请选择要上传的图片");
        }
        if (file.getSize() > MAX_IMAGE_SIZE) {
            return Result.error("文件大小不能超过5MB");
        }
        boolean acquired;
        try {
            acquired = PROCESSING_SLOTS.tryAcquire(PROCESSING_WAIT_SECONDS, TimeUnit.SECONDS);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return Result.error("上传繁忙，请稍后重试");
        }
        if (!acquired) {
            return Result.error("上传繁忙，请稍后重试");
        }
        try {
            return processUpload(userId, file);
        } finally {
            PROCESSING_SLOTS.release();
        }
    }

    private Result<Map<String, String>> processUpload(Long userId, MultipartFile file) throws IOException {
        byte[] bytes = file.getBytes();
        ImageFormat format = detectFormat(bytes);
        if (format == null) {
            return Result.error("不支持的文件类型，仅支持 JPEG、PNG、GIF");
        }

        ImageDimensions dimensions;
        try {
            dimensions = readDimensions(bytes);
        } catch (IOException e) {
            return Result.error("图片文件无效");
        }
        if (dimensions == null) {
            return Result.error("图片文件无效");
        }
        if ((long) dimensions.width() * dimensions.height() > MAX_PIXELS) {
            return Result.error("图片像素过大，请压缩后上传");
        }

        BufferedImage image;
        try {
            image = readForUpload(bytes);
        } catch (IOException e) {
            return Result.error("图片文件无效");
        }
        if (image == null) {
            return Result.error("图片文件无效");
        }

        String dateDir = AppTime.today().format(DateTimeFormatter.ofPattern("yyyy/MM/dd"));
        Path dir = uploadRoot.resolve(dateDir).normalize();
        Files.createDirectories(dir);

        String filename = UUID.randomUUID().toString().replace("-", "") + "." + format.extension();
        Path target = dir.resolve(filename).normalize();
        if (!target.startsWith(uploadRoot)) {
            return Result.error("上传路径无效");
        }

        BufferedImage output = ImageStorageService.resizeForUpload(prepareForWrite(image, format));
        if (!ImageIO.write(output, format.writerFormat(), target.toFile())) {
            return Result.error("图片处理失败");
        }

        String url = "/uploads/" + dateDir + "/" + filename;
        if (imageStorageService != null) {
            imageStorageService.registerOwnedUrl(userId, url);
        }
        return Result.success(Map.of("url", url));
    }

    /**
     * 解码图片：当原图明显大于目标尺寸时按 2/4 倍降采样读取，
     * 避免大图全量解码造成内存峰值；个别不支持降采样的格式自动回退全量解码。
     */
    private BufferedImage readForUpload(byte[] bytes) throws IOException {
        try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            if (input == null) {
                return null;
            }
            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) {
                return null;
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(input, true, true);
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                int maxSide = Math.max(width, height);
                int subsample = 1;
                // 解码尺寸至少保留目标 1.5 倍，避免降采样后再放大损失画质
                while (subsample * 2 <= 4 && maxSide / (subsample * 2) > UPLOAD_MAX_LONG_SIDE * 3 / 2) {
                    subsample *= 2;
                }
                ImageReadParam param = reader.getDefaultReadParam();
                if (subsample > 1) {
                    param.setSourceSubsampling(subsample, subsample, 0, 0);
                }
                return reader.read(0, param);
            } finally {
                reader.dispose();
            }
        } catch (Exception e) {
            // 降采样或读取失败时回退到全量解码
            return ImageIO.read(new ByteArrayInputStream(bytes));
        }
    }

    private ImageDimensions readDimensions(byte[] bytes) throws IOException {
        try (ImageInputStream input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
            if (input == null) {
                return null;
            }
            Iterator<ImageReader> readers = ImageIO.getImageReaders(input);
            if (!readers.hasNext()) {
                return null;
            }
            ImageReader reader = readers.next();
            try {
                reader.setInput(input, true, true);
                int width = reader.getWidth(0);
                int height = reader.getHeight(0);
                if (width <= 0 || height <= 0) {
                    return null;
                }
                return new ImageDimensions(width, height);
            } finally {
                reader.dispose();
            }
        }
    }

    private ImageFormat detectFormat(byte[] bytes) {
        if (bytes.length >= 3
                && (bytes[0] & 0xff) == 0xff
                && (bytes[1] & 0xff) == 0xd8
                && (bytes[2] & 0xff) == 0xff) {
            return ImageFormat.JPEG;
        }
        if (bytes.length >= 8
                && (bytes[0] & 0xff) == 0x89
                && bytes[1] == 0x50
                && bytes[2] == 0x4e
                && bytes[3] == 0x47
                && bytes[4] == 0x0d
                && bytes[5] == 0x0a
                && bytes[6] == 0x1a
                && bytes[7] == 0x0a) {
            return ImageFormat.PNG;
        }
        if (bytes.length >= 6
                && bytes[0] == 0x47
                && bytes[1] == 0x49
                && bytes[2] == 0x46
                && bytes[3] == 0x38
                && (bytes[4] == 0x37 || bytes[4] == 0x39)
                && bytes[5] == 0x61) {
            return ImageFormat.GIF;
        }
        return null;
    }

    private BufferedImage prepareForWrite(BufferedImage image, ImageFormat format) {
        if (format == ImageFormat.PNG) {
            BufferedImage output = new BufferedImage(image.getWidth(), image.getHeight(), BufferedImage.TYPE_INT_ARGB);
            Graphics2D graphics = output.createGraphics();
            try {
                graphics.drawImage(image, 0, 0, null);
            } finally {
                graphics.dispose();
            }
            return output;
        }

        BufferedImage output = new BufferedImage(image.getWidth(), image.getHeight(), BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = output.createGraphics();
        try {
            graphics.setColor(Color.WHITE);
            graphics.fillRect(0, 0, output.getWidth(), output.getHeight());
            graphics.drawImage(image, 0, 0, null);
        } finally {
            graphics.dispose();
        }
        return output;
    }

    private enum ImageFormat {
        JPEG("jpg", "jpg"),
        PNG("png", "png"),
        GIF("gif", "gif");

        private final String extension;
        private final String writerFormat;

        ImageFormat(String extension, String writerFormat) {
            this.extension = extension;
            this.writerFormat = writerFormat;
        }

        String extension() {
            return extension;
        }

        String writerFormat() {
            return writerFormat;
        }
    }

    private record ImageDimensions(int width, int height) {
    }
}
