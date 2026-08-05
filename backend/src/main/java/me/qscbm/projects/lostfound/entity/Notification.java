package me.qscbm.projects.lostfound.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("notification")
public class Notification {
    @TableId(type = IdType.AUTO)
    private Long id;
    private Long userId;
    private String title;
    @TableField("content")
    private String content;
    private String type;
    private Long relatedId;
    private String relatedType;
    private Boolean isRead;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
