package me.qscbm.projects.lostfound.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class LostItemRequest {
    @NotBlank
    @Size(max = 200)
    private String title;
    @Size(max = 5000)
    private String description;
    @NotNull
    private Long categoryId;
    @Size(max = 200)
    private String location;
    @NotNull
    private LocalDateTime lostTime;
    private LocalDateTime lostTimeEnd;
    private List<String> imageUrls;
    @Size(max = 500)
    private String coverImage;
}
