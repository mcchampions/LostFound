package me.qscbm.projects.lostfound.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class MessageRequest {
    @NotBlank
    @Size(max = 100)
    private String conversationId;
    @NotNull
    private Long receiverId;
    @NotBlank
    @Size(max = 5000)
    private String content;
}
