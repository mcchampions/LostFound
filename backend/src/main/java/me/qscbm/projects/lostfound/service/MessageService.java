package me.qscbm.projects.lostfound.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import me.qscbm.projects.lostfound.dto.*;
import java.util.List;

public interface MessageService {
    MessageVO send(Long senderId, MessageRequest req);
    IPage<MessageVO> getMessages(Long userId, String conversationId, int page, int size);
    List<ConversationVO> getConversations(Long userId);
    void markRead(Long userId, Long messageId);
    void markConversationRead(Long userId, String conversationId);
    void systemMessage(String conversationId, Long senderId, Long receiverId, String content);
    boolean isParticipant(Long userId, String conversationId);
    String startConversation(Long userId1, Long userId2);
}
