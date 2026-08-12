package me.qscbm.projects.lostfound.service.impl;

import com.baomidou.mybatisplus.core.conditions.query.QueryWrapper;
import lombok.extern.slf4j.Slf4j;
import me.qscbm.projects.lostfound.common.AppTime;
import me.qscbm.projects.lostfound.common.AppHome;
import me.qscbm.projects.lostfound.common.BusinessException;
import me.qscbm.projects.lostfound.entity.ClaimApplication;
import me.qscbm.projects.lostfound.entity.FoundItem;
import me.qscbm.projects.lostfound.entity.LostItem;
import me.qscbm.projects.lostfound.entity.MediaFile;
import me.qscbm.projects.lostfound.mapper.ClaimApplicationMapper;
import me.qscbm.projects.lostfound.mapper.FoundItemMapper;
import me.qscbm.projects.lostfound.mapper.LostItemMapper;
import me.qscbm.projects.lostfound.mapper.MediaFileMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import javax.imageio.IIOImage;
import javax.imageio.ImageIO;
import javax.imageio.ImageWriteParam;
import javax.imageio.ImageWriter;
import javax.imageio.stream.ImageOutputStream;
import java.awt.Graphics2D;
import java.awt.RenderingHints;
import java.awt.image.BufferedImage;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.InvalidPathException;
import java.nio.file.Path;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Collections;

/**
 * 上传图片生命周期管理：
 * <ul>
 *   <li>上传时最长边压缩到 1080P，防止超大文件进入后端；</li>
 *   <li>每日定时：超过 7 天压缩到 720P，超过 30 天压缩到 540P；</li>
 *   <li>物品标记为已解决时立即压缩到 540P；</li>
 *   <li>物品（或其图片）被删除时同步删除文件。</li>
 * </ul>
 */
@Slf4j
@Component
public class ImageStorageService {

    static final int UPLOAD_MAX_LONG_SIDE = 1080;
    static final int WEEK_MAX_LONG_SIDE = 720;
    static final int MONTH_MAX_LONG_SIDE = 540;

    private final Path uploadRoot;
    private final MediaFileMapper mediaFileMapper;
    private final LostItemMapper lostItemMapper;
    private final FoundItemMapper foundItemMapper;
    private final ClaimApplicationMapper claimApplicationMapper;

    public ImageStorageService(@Value("${app.upload.path:./uploads}") String uploadPath) {
        this(uploadPath, null, null, null, null);
    }

    @org.springframework.beans.factory.annotation.Autowired
    public ImageStorageService(@Value("${app.upload.path:./uploads}") String uploadPath,
                               MediaFileMapper mediaFileMapper,
                               LostItemMapper lostItemMapper,
                               FoundItemMapper foundItemMapper,
                               ClaimApplicationMapper claimApplicationMapper) {
        File dir = new File(uploadPath);
        if (!dir.isAbsolute()) {
            dir = new File(AppHome.dir(), uploadPath);
        }
        this.uploadRoot = dir.toPath().toAbsolutePath().normalize();
        this.mediaFileMapper = mediaFileMapper;
        this.lostItemMapper = lostItemMapper;
        this.foundItemMapper = foundItemMapper;
        this.claimApplicationMapper = claimApplicationMapper;
    }

    public void registerOwnedUrl(Long ownerId, String url) {
        if (ownerId == null || url == null || url.isBlank()) {
            throw new BusinessException("图片资源无效");
        }
        requireUploadUrl(url);
        if (mediaFileMapper == null) return;
        MediaFile media = new MediaFile();
        media.setUrl(url);
        media.setOwnerId(ownerId);
        mediaFileMapper.insert(media);
    }

    public void validateOwnedUrls(Long ownerId, List<String> urls) {
        if (urls == null) return;
        for (String url : urls) validateOwnedUrl(ownerId, url);
    }

    public void validateOwnedUrl(Long ownerId, String url) {
        if (url == null || url.isBlank()) return;
        requireUploadUrl(url);
        if (mediaFileMapper == null) return;
        MediaFile media = mediaFileMapper.selectById(url);
        if (media == null || !ownerId.equals(media.getOwnerId())) {
            throw new BusinessException("图片资源不存在或不属于当前用户");
        }
    }

    private void requireUploadUrl(String url) {
        if (!url.startsWith("/uploads/") || url.length() <= "/uploads/".length()
                || url.indexOf('%') >= 0 || url.indexOf('\\') >= 0 || url.indexOf('\0') >= 0) {
            throw new BusinessException("图片地址仅支持站内上传资源");
        }
        String relative = url.substring("/uploads/".length());
        for (String segment : relative.split("/", -1)) {
            if (segment.isEmpty() || ".".equals(segment) || "..".equals(segment)
                    || !segment.matches("[A-Za-z0-9._-]+")) {
                throw new BusinessException("图片地址格式无效");
            }
        }
    }

    /** 上传后压缩：最长边超过 1080 时缩放（小图原样返回）。 */
    public static BufferedImage resizeForUpload(BufferedImage image) {
        return resize(image, UPLOAD_MAX_LONG_SIDE);
    }

    /** 物品已解决：图片直接压缩到 540P。 */
    public void compressItemTo540p(List<String> urls) {
        for (String url : urls) {
            Path file = resolveUrl(url);
            if (file != null) {
                resizeToLongSide(file, MONTH_MAX_LONG_SIDE);
            }
        }
    }

    /** 删除物品时清理对应文件（文件不存在时静默跳过）。 */
    public void deleteFiles(List<String> urls) {
        for (String url : urls) {
            Path file = resolveUrl(url);
            if (file == null) {
                deleteMediaRecordIfUnreferenced(url);
                continue;
            }
            try {
                Files.deleteIfExists(file);
                log.info("图片清理: 已删除 {}", file.getFileName());
            } catch (IOException e) {
                log.warn("图片清理失败: {}", file, e);
            }
            deleteMediaRecordIfUnreferenced(url);
        }
    }

    /**
     * 删除 media_file 中已无任何业务引用的记录。
     * 图片可能同时被多个物品/认领申请引用，只有全部解除后才允许清理，
     * 否则会导致其他页面图片失效。
     */
    private void deleteMediaRecordIfUnreferenced(String url) {
        if (mediaFileMapper == null || url == null || url.isBlank()) {
            return;
        }
        if (isReferenced(url)) {
            return;
        }
        int deleted = mediaFileMapper.deleteById(url);
        if (deleted > 0) {
            log.info("媒体记录清理: 已删除无引用记录 {}", url);
        }
    }

    private boolean isReferenced(String url) {
        Long lostReferences = lostItemMapper == null ? 0L
                : lostItemMapper.selectCount(new QueryWrapper<LostItem>()
                        .and(wrapper -> wrapper.eq("cover_image", url)
                                .or().like("image_urls", url)));
        Long foundReferences = foundItemMapper == null ? 0L
                : foundItemMapper.selectCount(new QueryWrapper<FoundItem>()
                        .and(wrapper -> wrapper.eq("cover_image", url)
                                .or().like("image_urls", url)));
        Long claimReferences = claimApplicationMapper == null ? 0L
                : claimApplicationMapper.selectCount(new QueryWrapper<ClaimApplication>()
                        .like("image_urls", url));
        return (lostReferences != null && lostReferences > 0)
                || (foundReferences != null && foundReferences > 0)
                || (claimReferences != null && claimReferences > 0);
    }

    /** 每日 03:30 按上传日期压缩：7 天以上 -> 720P，30 天以上 -> 540P。 */
    @Scheduled(cron = "0 30 3 * * *")
    public void compressByAge() {
        LocalDate today = AppTime.today();
        try (var stream = Files.walk(uploadRoot, 3)) {
            stream.filter(Files::isDirectory)
                    .filter(this::isDateDir)
                    .forEach(dir -> {
                        long age = ChronoUnit.DAYS.between(parseDateDir(dir), today);
                        int target = age >= 30 ? MONTH_MAX_LONG_SIDE
                                : age >= 7 ? WEEK_MAX_LONG_SIDE : 0;
                        if (target == 0) {
                            return;
                        }
                        try (var files = Files.list(dir)) {
                            files.filter(Files::isRegularFile)
                                    .forEach(file -> resizeToLongSide(file, target));
                        } catch (IOException e) {
                            log.warn("定时压缩遍历失败: {}", dir, e);
                        }
                    });
        } catch (IOException e) {
            log.error("定时压缩任务异常", e);
        }
    }

    private void resizeToLongSide(Path file, int maxLongSide) {
        try {
            BufferedImage image = ImageIO.read(file.toFile());
            if (image == null) {
                return;
            }
            BufferedImage resized = resize(image, maxLongSide);
            if (resized == image) {
                return;
            }
            String name = file.getFileName().toString().toLowerCase();
            if (name.endsWith(".jpg") || name.endsWith(".jpeg")) {
                writeJpeg(resized, file.toFile());
            } else {
                ImageIO.write(resized, name.endsWith(".gif") ? "gif" : "png", file.toFile());
            }
            log.info("图片压缩: {} -> 最长边 {}px", file.getFileName(), maxLongSide);
        } catch (Exception e) {
            log.warn("图片压缩失败: {}", file, e);
        }
    }

    private static BufferedImage resize(BufferedImage image, int maxLongSide) {
        int width = image.getWidth();
        int height = image.getHeight();
        if (Math.max(width, height) <= maxLongSide) {
            return image;
        }
        double scale = (double) maxLongSide / Math.max(width, height);
        int newWidth = Math.max(1, (int) Math.round(width * scale));
        int newHeight = Math.max(1, (int) Math.round(height * scale));
        boolean hasAlpha = image.getColorModel().hasAlpha();
        BufferedImage output = new BufferedImage(newWidth, newHeight,
                hasAlpha ? BufferedImage.TYPE_INT_ARGB : BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = output.createGraphics();
        try {
            graphics.setRenderingHint(RenderingHints.KEY_INTERPOLATION,
                    RenderingHints.VALUE_INTERPOLATION_BILINEAR);
            graphics.drawImage(image, 0, 0, newWidth, newHeight, null);
        } finally {
            graphics.dispose();
        }
        return output;
    }

    private static void writeJpeg(BufferedImage image, File target) throws IOException {
        ImageWriter writer = ImageIO.getImageWritersByFormatName("jpg").next();
        try (ImageOutputStream output = ImageIO.createImageOutputStream(target)) {
            writer.setOutput(output);
            ImageWriteParam param = writer.getDefaultWriteParam();
            if (param.canWriteCompressed()) {
                param.setCompressionMode(ImageWriteParam.MODE_EXPLICIT);
                param.setCompressionQuality(0.85f);
            }
            writer.write(null, new IIOImage(image, null, null), param);
        } finally {
            writer.dispose();
        }
    }

    private Path resolveUrl(String url) {
        if (url == null || url.isBlank()) {
            return null;
        }
        String relative = url.startsWith("/uploads/") ? url.substring("/uploads/".length()) : url;
        try {
            Path file = uploadRoot.resolve(relative).normalize();
            if (!file.startsWith(uploadRoot) || !Files.isRegularFile(file)) {
                return null;
            }
            return file;
        } catch (InvalidPathException e) {
            return null;
        }
    }

    private boolean isDateDir(Path dir) {
        if (uploadRoot.equals(dir) || uploadRoot.relativize(dir).getNameCount() != 3) {
            return false;
        }
        Path relative = uploadRoot.relativize(dir);
        return relative.getName(0).toString().matches("\\d{4}")
                && relative.getName(1).toString().matches("\\d{2}")
                && relative.getName(2).toString().matches("\\d{2}");
    }

    private LocalDate parseDateDir(Path dir) {
        Path relative = uploadRoot.relativize(dir);
        return LocalDate.of(
                Integer.parseInt(relative.getName(0).toString()),
                Integer.parseInt(relative.getName(1).toString()),
                Integer.parseInt(relative.getName(2).toString()));
    }
}
