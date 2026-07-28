package me.qscbm.projects.lostfound.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AnnouncementRequest {
    @NotBlank
    @Size(max = 200)
    private String title;
    @NotBlank
    @Size(max = 10000)
    private String content;
}
