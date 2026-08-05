package me.qscbm.projects.lostfound.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class MessageVO {
    private Long id;
    private String conversationId;
    private Long senderId;
    private String senderName;
    private Long receiverId;
    private String content;
    private Boolean isRead;
    private LocalDateTime createdAt;
}
