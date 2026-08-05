package me.qscbm.projects.lostfound.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import me.qscbm.projects.lostfound.entity.EmailVerificationCode;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface EmailVerificationCodeMapper extends BaseMapper<EmailVerificationCode> {

    @Insert("""
            INSERT INTO email_verification_code
                (user_id, email, code_hash, sent_at, expires_at, attempts)
            VALUES
                (#{record.userId}, #{record.email}, #{record.codeHash},
                 #{record.sentAt}, #{record.expiresAt}, 0)
            ON DUPLICATE KEY UPDATE
                email = IF(sent_at <= #{cooldownBefore}, VALUES(email), email),
                code_hash = IF(sent_at <= #{cooldownBefore}, VALUES(code_hash), code_hash),
                expires_at = IF(sent_at <= #{cooldownBefore}, VALUES(expires_at), expires_at),
                attempts = IF(sent_at <= #{cooldownBefore}, 0, attempts),
                sent_at = IF(sent_at <= #{cooldownBefore}, VALUES(sent_at), sent_at)
            """)
    int upsertIfCooldown(@Param("record") EmailVerificationCode record,
                         @Param("cooldownBefore") long cooldownBefore);

    @Update("""
            UPDATE email_verification_code
            SET attempts = attempts + 1
            WHERE user_id = #{userId}
              AND attempts < #{maxAttempts}
            """)
    int incrementAttempts(@Param("userId") Long userId,
                          @Param("maxAttempts") int maxAttempts);

    @Delete("""
            DELETE FROM email_verification_code
            WHERE user_id = #{userId}
              AND code_hash = #{codeHash}
            """)
    int deleteMatching(@Param("userId") Long userId,
                       @Param("codeHash") String codeHash);
}
