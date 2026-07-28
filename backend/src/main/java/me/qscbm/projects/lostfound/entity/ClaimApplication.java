package me.qscbm.projects.lostfound.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("claim_application")
public class ClaimApplication {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String itemType;
    private Long itemId;
    private Long applicantId;
    private Long publisherId;
    private String message;
    private String imageUrls;
    private String status;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
