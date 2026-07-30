package me.qscbm.projects.lostfound.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("lost_item")
public class LostItem {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String title;
    private String description;
    private Long categoryId;
    private String location;
    private LocalDateTime lostTime;
    private LocalDateTime lostTimeEnd;
    private String imageUrls;
    private String coverImage;
    private String status;
    private Long resolvedBy;
    private String resolvedType;
    private String resolvedNote;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
