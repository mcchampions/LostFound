package me.qscbm.projects.lostfound.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class LostItemRequest {
    @NotBlank
    private String title;
    private String description;
    @NotNull
    private Long categoryId;
    private String location;
    @NotNull
    private LocalDateTime lostTime;
    private List<String> imageUrls;
    private String coverImage;
}
