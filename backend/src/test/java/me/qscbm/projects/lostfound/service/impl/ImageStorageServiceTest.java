package me.qscbm.projects.lostfound.service.impl;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.Graphics2D;
import java.awt.image.BufferedImage;
import java.io.File;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ImageStorageServiceTest {

    @TempDir
    Path uploadRoot;

    private BufferedImage image(int width, int height) {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_RGB);
        Graphics2D graphics = image.createGraphics();
        graphics.setColor(Color.RED);
        graphics.fillRect(0, 0, width, height);
        graphics.dispose();
        return image;
    }

    @Test
    void resizeForUploadDownscalesLargeImagesAndKeepsSmallOnes() {
        BufferedImage large = ImageStorageService.resizeForUpload(image(2000, 1000));
        assertThat(large.getWidth()).isEqualTo(1080);
        assertThat(large.getHeight()).isEqualTo(540);

        BufferedImage small = ImageStorageService.resizeForUpload(image(100, 80));
        assertThat(small.getWidth()).isEqualTo(100);
        assertThat(small.getHeight()).isEqualTo(80);
    }

    @Test
    void compressItemTo540pResizesExistingFile() throws Exception {
        Path dir = uploadRoot.resolve("2026/08/01");
        Files.createDirectories(dir);
        File file = dir.resolve("test.png").toFile();
        ImageIO.write(image(2000, 1000), "png", file);
        ImageStorageService service = new ImageStorageService(uploadRoot.toString());

        service.compressItemTo540p(List.of("/uploads/2026/08/01/test.png"));

        BufferedImage decoded = ImageIO.read(file);
        assertThat(decoded.getWidth()).isEqualTo(540);
        assertThat(decoded.getHeight()).isEqualTo(270);
    }

    @Test
    void deleteFilesRemovesOnlyFilesInsideUploadRoot() throws Exception {
        Path dir = uploadRoot.resolve("2026/08/01");
        Files.createDirectories(dir);
        Path file = dir.resolve("a.png");
        Files.write(file, new byte[]{1, 2, 3});
        ImageStorageService service = new ImageStorageService(uploadRoot.toString());

        service.deleteFiles(List.of("/uploads/2026/08/01/a.png", "/uploads/../../outside.png"));

        assertThat(Files.exists(file)).isFalse();
        assertThat(Files.exists(uploadRoot.resolve("outside.png"))).isFalse();
    }
}
