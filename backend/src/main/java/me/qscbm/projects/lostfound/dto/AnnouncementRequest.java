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
    /** 是否置顶（默认 false）。 */
    private Boolean isPinned;
    /** 是否发布上线（默认 true；下线后普通用户不可见）。 */
    private Boolean isActive;
}
