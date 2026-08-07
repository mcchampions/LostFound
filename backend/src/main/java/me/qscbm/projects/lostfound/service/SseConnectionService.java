package me.qscbm.projects.lostfound.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.time.Instant;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
public class SseConnectionService {

    public static final String MESSAGE_EVENT = "message";
    public static final String NOTIFICATION_EVENT = "notification";

    private final ConcurrentHashMap<Long, Set<SseEmitter>> connections = new ConcurrentHashMap<>();

    public SseEmitter connect(Long userId) {
        SseEmitter emitter = new SseEmitter(0L);
        connections.computeIfAbsent(userId, ignored -> ConcurrentHashMap.newKeySet()).add(emitter);
        emitter.onCompletion(() -> remove(userId, emitter));
        emitter.onTimeout(() -> remove(userId, emitter));
        emitter.onError(error -> remove(userId, emitter));
        try {
            emitter.send(SseEmitter.event().name("connected").data("ok"));
        } catch (IOException | IllegalStateException exception) {
            remove(userId, emitter);
            emitter.completeWithError(exception);
            throw new IllegalStateException("SSE 连接初始化失败", exception);
        }
        log.debug("SSE connected: userId={}, count={}", userId, connectionCount(userId));
        return emitter;
    }

    public void sendToUser(Long userId, String eventName, Object payload) {
        Set<SseEmitter> emitters = connections.get(userId);
        if (emitters == null || emitters.isEmpty()) return;
        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event().name(eventName).data(payload));
            } catch (IOException | IllegalStateException exception) {
                remove(userId, emitter);
                emitter.completeWithError(exception);
            }
        }
    }

    public boolean isOnline(Long userId) {
        Set<SseEmitter> emitters = userId == null ? null : connections.get(userId);
        return emitters != null && !emitters.isEmpty();
    }

    @Scheduled(fixedRateString = "${app.sse.heartbeat-interval-ms:20000}")
    public void heartbeat() {
        connections.keySet().forEach(userId -> sendToUser(userId, "heartbeat", Instant.now().toString()));
    }

    int connectionCount(Long userId) {
        Set<SseEmitter> emitters = connections.get(userId);
        return emitters == null ? 0 : emitters.size();
    }

    private void remove(Long userId, SseEmitter emitter) {
        connections.computeIfPresent(userId, (ignored, emitters) -> {
            emitters.remove(emitter);
            return emitters.isEmpty() ? null : emitters;
        });
        log.debug("SSE disconnected: userId={}, count={}", userId, connectionCount(userId));
    }
}
