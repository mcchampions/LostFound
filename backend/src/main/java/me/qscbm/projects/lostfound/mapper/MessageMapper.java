package me.qscbm.projects.lostfound.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import me.qscbm.projects.lostfound.entity.Message;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

import java.util.List;
import java.util.Map;

@Mapper
public interface MessageMapper extends BaseMapper<Message> {

    /**
     * 参数化查询会话汇总，避免SQL拼接注入风险。
     */
    @Select("SELECT conversation_id AS conversationId, "
            + "MAX(id) AS latestId, "
            + "SUM(CASE WHEN receiver_id = #{userId} AND is_read = 0 THEN 1 ELSE 0 END) AS unreadCount "
            + "FROM message "
            + "WHERE sender_id = #{userId} OR receiver_id = #{userId} "
            + "GROUP BY conversation_id "
            + "ORDER BY latestId DESC")
    List<Map<String, Object>> selectConversationSummaries(@Param("userId") Long userId);
}
