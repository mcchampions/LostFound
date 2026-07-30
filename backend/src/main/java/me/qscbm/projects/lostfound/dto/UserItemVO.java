package me.qscbm.projects.lostfound.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class UserItemVO {
    private Long id;
    private Long userId;
    private String itemType;
    private String title;
    private String status;
    private String coverImage;
    private String location;
    private LocalDateTime createdAt;
    private LocalDateTime eventTime;
    private LocalDateTime eventTimeEnd;
    private String publisherName;
    private String resolvedType;
    private Long resolvedBy;
    private String resolvedByName;
    private String resolvedNote;
}
