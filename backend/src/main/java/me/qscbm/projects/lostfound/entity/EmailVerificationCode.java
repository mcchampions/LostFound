package me.qscbm.projects.lostfound.entity;

import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

@Data
@TableName("email_verification_code")
public class EmailVerificationCode {
    @TableId
    private Long userId;
    private String email;
    private String codeHash;
    private Long sentAt;
    private Long expiresAt;
    private Integer attempts;
}
