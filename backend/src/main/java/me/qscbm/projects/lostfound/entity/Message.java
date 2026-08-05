package me.qscbm.projects.lostfound.entity;

import com.baomidou.mybatisplus.annotation.*;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@TableName("message")
public class Message {
    @TableId(type = IdType.AUTO)
    private Long id;
    private String conversationId;
    private Long senderId;
    private Long receiverId;
    private String content;
    private Boolean isRead;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
