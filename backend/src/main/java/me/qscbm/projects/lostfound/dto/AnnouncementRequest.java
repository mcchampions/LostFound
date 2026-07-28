package me.qscbm.projects.lostfound.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AnnouncementRequest {
    @NotBlank private String title;
    @NotBlank private String content;
}
