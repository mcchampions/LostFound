package me.qscbm.projects.lostfound.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Tracks WebSocket connection counts per user for online presence detection.
 * <p>
 * Single-instance implementation. For multi-instance deployment, replace with
 * Redis presence or shared short-TTL keys.
 */
@Slf4j
@Service
public class WebSocketPresenceService {

    private final ConcurrentHashMap<Long, AtomicInteger> connections = new ConcurrentHashMap<>();

    public void onConnect(Long userId) {
        if (userId == null) return;
        connections.computeIfAbsent(userId, k -> new AtomicInteger(0)).incrementAndGet();
        log.debug("WebSocket connect: userId={}, count={}", userId, connections.get(userId));
    }

    public void onDisconnect(Long userId) {
        if (userId == null) return;
        AtomicInteger count = connections.get(userId);
        if (count == null) return;
        int remaining = count.decrementAndGet();
        if (remaining <= 0) {
            connections.remove(userId);
        }
        log.debug("WebSocket disconnect: userId={}, count={}", userId, remaining);
    }

    public boolean isOnline(Long userId) {
        if (userId == null) return false;
        AtomicInteger count = connections.get(userId);
        return count != null && count.get() > 0;
    }
}
