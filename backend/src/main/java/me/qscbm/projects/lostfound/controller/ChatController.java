package me.qscbm.projects.lostfound.controller;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import me.qscbm.projects.lostfound.common.PageResult;
import me.qscbm.projects.lostfound.common.Result;
import me.qscbm.projects.lostfound.dto.*;
import me.qscbm.projects.lostfound.service.MessageService;
import me.qscbm.projects.lostfound.service.SseConnectionService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/chat")
@RequiredArgsConstructor
@Validated
public class ChatController {

    private final MessageService messageService;
    private final SseConnectionService sseConnectionService;

    @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter stream(@AuthenticationPrincipal Long userId, HttpServletResponse response) {
        response.setHeader("Cache-Control", "no-cache");
        response.setHeader("X-Accel-Buffering", "no");
        return sseConnectionService.connect(userId);
    }

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
            @RequestParam(defaultValue = "1") @Min(1) int page,
            @RequestParam(defaultValue = "50") @Min(1) @Max(100) int size) {
        return Result.success(PageResult.of(
                messageService.getMessages(userId, conversationId, page, size)));
    }

    @GetMapping("/messages/{conversationId}/latest")
    public Result<MessageBatchVO> latestMessages(
            @AuthenticationPrincipal Long userId,
            @PathVariable String conversationId,
            @RequestParam(defaultValue = "50") @Min(1) @Max(100) int size) {
        return Result.success(messageService.getLatestMessages(userId, conversationId, size));
    }

    @GetMapping("/messages/{conversationId}/before/{beforeId}")
    public Result<MessageBatchVO> messagesBefore(
            @AuthenticationPrincipal Long userId,
            @PathVariable String conversationId,
            @PathVariable Long beforeId,
            @RequestParam(defaultValue = "50") @Min(1) @Max(100) int size) {
        return Result.success(messageService.getMessagesBefore(userId, conversationId, beforeId, size));
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
