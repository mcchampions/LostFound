package me.qscbm.projects.lostfound.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class FoundItemVO {
    private Long id;
    private Long userId;
    private String userName;
    private String title;
    private String description;
    private Long categoryId;
    private String categoryName;
    private String location;
    private LocalDateTime foundTime;
    private List<String> imageUrls;
    private String coverImage;
    private String status;
    private LocalDateTime createdAt;
}
