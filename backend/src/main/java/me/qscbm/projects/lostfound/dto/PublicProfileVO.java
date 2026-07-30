package me.qscbm.projects.lostfound.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class PublicProfileVO {
    private Long id;
    private String username;
    private String realName;
    private String avatar;
    private LocalDateTime createdAt;
    private int lostCount;
    private int foundCount;
    private int resolvedCount;
    private int helpedCount;
    private int pendingCount;
}
