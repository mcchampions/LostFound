package me.qscbm.projects.lostfound.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import me.qscbm.projects.lostfound.entity.EmailVerificationCode;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

@Mapper
public interface EmailVerificationCodeMapper extends BaseMapper<EmailVerificationCode> {

    @Update("""
            UPDATE email_verification_code
            SET email = #{record.email},
                code_hash = #{record.codeHash},
                sent_at = #{record.sentAt},
                expires_at = #{record.expiresAt},
                attempts = 0
            WHERE user_id = #{record.userId}
              AND sent_at <= #{cooldownBefore}
            """)
    int updateIfCooldown(@Param("record") EmailVerificationCode record,
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
