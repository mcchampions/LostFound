package me.qscbm.projects.lostfound.entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("user_email_preference")
public class UserEmailPreference {
    @TableId
    private Long userId;
    private Integer claimRequest;
    private Integer claimResult;
    private Integer announcement;
    private Integer message;
    private Integer system;
    private LocalDateTime lastMessageNotifiedAt;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
    @TableField(fill = FieldFill.INSERT_UPDATE)
    private LocalDateTime updatedAt;
}
