package me.qscbm.projects.lostfound.entity;

import com.baomidou.mybatisplus.annotation.FieldFill;
import com.baomidou.mybatisplus.annotation.TableField;
import com.baomidou.mybatisplus.annotation.TableName;
import com.baomidou.mybatisplus.annotation.TableId;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("media_file")
public class MediaFile {
    @TableId
    private String url;
    private Long ownerId;
    @TableField(fill = FieldFill.INSERT)
    private LocalDateTime createdAt;
}
