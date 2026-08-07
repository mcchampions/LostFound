package me.qscbm.projects.lostfound.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class CoverGenRequest {
    @NotBlank(message = "标题不能为空")
    @Size(max = 200, message = "标题过长")
    private String title;

    @Size(max = 800, message = "正文过长")
    private String content;

    @Size(max = 100, message = "类别过长")
    private String category;

    @Size(max = 100, message = "地点过长")
    private String location;

    @Size(max = 50, message = "日期过长")
    private String date;

    private String template = "xhs-note";
}
