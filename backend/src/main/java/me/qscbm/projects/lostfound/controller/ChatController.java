package me.qscbm.projects.lostfound.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import me.qscbm.projects.lostfound.common.PageResult;
import me.qscbm.projects.lostfound.common.Result;
import me.qscbm.projects.lostfound.dto.*;
import me.qscbm.projects.lostfound.service.MessageService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
public class ChatController {

    private final MessageService messageService;

    @PostMapping("/start/{targetUserId}")
    public Result<Map<String, String>> startConversation(
            @AuthenticationPrincipal Long userId,
            @PathVariable Long targetUserId) {
        String convId = messageService.startConversation(userId, targetUserId);
        return Result.success(Map.of("conversationId", convId));
    }

    @PostMapping("/send")
    public Result<MessageVO> send(@AuthenticationPrincipal Long userId,
                                  @Valid @RequestBody MessageRequest req) {
        return Result.success(messageService.send(userId, req));
    }

    @GetMapping("/conversations")
    public Result<List<ConversationVO>> conversations(@AuthenticationPrincipal Long userId) {
        return Result.success(messageService.getConversations(userId));
    }

    @GetMapping("/messages/{conversationId}")
    public Result<PageResult<MessageVO>> messages(
            @AuthenticationPrincipal Long userId,
            @PathVariable String conversationId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "50") int size) {
        return Result.success(PageResult.of(
                messageService.getMessages(userId, conversationId, page, size)));
    }

    @PutMapping("/messages/{id}/read")
    public Result<?> markRead(@AuthenticationPrincipal Long userId, @PathVariable Long id) {
        messageService.markRead(userId, id);
        return Result.success();
    }

    @PutMapping("/conversations/{conversationId}/read")
    public Result<?> markConversationRead(
            @AuthenticationPrincipal Long userId,
            @PathVariable String conversationId) {
        messageService.markConversationRead(userId, conversationId);
        return Result.success();
    }
}
