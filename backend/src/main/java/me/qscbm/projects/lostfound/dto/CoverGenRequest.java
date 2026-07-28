package me.qscbm.projects.lostfound.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CoverGenRequest {
    @NotBlank(message = "标题不能为空")
    @Size(max = 100, message = "标题过长")
    private String title;

    @Size(max = 200, message = "副标题过长")
    private String subtitle;

    private String template = "xhs-note";
    private String theme = "cream";
}
