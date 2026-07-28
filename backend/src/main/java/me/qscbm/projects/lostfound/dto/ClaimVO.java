package me.qscbm.projects.lostfound.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ClaimVO {
    private Long id;
    private String itemType;
    private Long itemId;
    private String itemTitle;
    private Long applicantId;
    private String applicantName;
    private Long publisherId;
    private String publisherName;
    private String message;
    private String imageUrls;
    private String status;
    private LocalDateTime createdAt;
}
