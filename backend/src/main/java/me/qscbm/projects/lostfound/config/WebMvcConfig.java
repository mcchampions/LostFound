package me.qscbm.projects.lostfound.config;

import me.qscbm.projects.lostfound.common.AppHome;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.File;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {

    private final String uploadPath;

    public WebMvcConfig(@Value("${app.upload.path:./uploads}") String uploadPath) {
        File dir = new File(uploadPath);
        if (!dir.isAbsolute()) {
            dir = new File(AppHome.dir(), uploadPath);
        }
        this.uploadPath = dir.toPath().toAbsolutePath().normalize().toString().replace('\\', '/');
    }

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // /uploads/** is now served by FileController with a placeholder fallback.
    }
}
