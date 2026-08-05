package me.qscbm.projects.lostfound.controller;

import me.qscbm.projects.lostfound.common.Result;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

import javax.imageio.ImageIO;
import java.awt.Color;
import java.awt.image.BufferedImage;
import java.io.ByteArrayOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class UploadControllerTest {

    @TempDir
    Path uploadRoot;

    @Test
    void acceptsImageBySignatureAndReencodesIt() throws Exception {
        UploadController controller = new UploadController(uploadRoot.toString());
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "payload.exe",
                "application/octet-stream",
                createPng(12, 8)
        );

        Result<Map<String, String>> result = controller.upload(1L, file);

        assertThat(result.getCode()).isZero();
        String url = result.getData().get("url");
        assertThat(url).endsWith(".png");

        Path saved = uploadRoot.resolve(url.substring("/uploads/".length()));
        assertThat(Files.exists(saved)).isTrue();
        BufferedImage decoded = ImageIO.read(saved.toFile());
        assertThat(decoded.getWidth()).isEqualTo(12);
        assertThat(decoded.getHeight()).isEqualTo(8);
    }

    @Test
    void rejectsContentThatOnlyPretendsToBeAnImage() throws Exception {
        UploadController controller = new UploadController(uploadRoot.toString());
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "fake.jpg",
                "image/jpeg",
                "not-an-image".getBytes()
        );

        Result<Map<String, String>> result = controller.upload(1L, file);

        assertThat(result.getCode()).isEqualTo(1);
        assertThat(result.getMessage()).contains("不支持的文件类型");
        try (var files = Files.walk(uploadRoot)) {
            assertThat(files.filter(Files::isRegularFile)).isEmpty();
        }
    }

    @Test
    void rejectsCorruptedImageWithValidSignature() throws Exception {
        UploadController controller = new UploadController(uploadRoot.toString());
        byte[] corruptedJpeg = {(byte) 0xff, (byte) 0xd8, (byte) 0xff, 0x00, 0x01};
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "broken.jpg",
                "image/jpeg",
                corruptedJpeg
        );

        Result<Map<String, String>> result = controller.upload(1L, file);

        assertThat(result.getCode()).isEqualTo(1);
        assertThat(result.getMessage()).isEqualTo("图片文件无效");
    }

    private byte[] createPng(int width, int height) throws Exception {
        BufferedImage image = new BufferedImage(width, height, BufferedImage.TYPE_INT_ARGB);
        image.setRGB(0, 0, Color.RED.getRGB());
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        ImageIO.write(image, "png", output);
        return output.toByteArray();
    }
}
