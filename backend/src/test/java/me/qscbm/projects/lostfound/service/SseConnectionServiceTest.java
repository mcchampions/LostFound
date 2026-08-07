package me.qscbm.projects.lostfound.service;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

class SseConnectionServiceTest {

    @Test
    void tracksMultipleConnectionsForOneUser() {
        SseConnectionService service = new SseConnectionService();

        service.connect(7L);
        service.connect(7L);

        assertThat(service.isOnline(7L)).isTrue();
        assertThat(service.connectionCount(7L)).isEqualTo(2);
    }

    @Test
    void sendsEventsAndHeartbeatsToConnectedUsers() {
        SseConnectionService service = new SseConnectionService();
        service.connect(7L);

        assertThatCode(() -> {
            service.sendToUser(7L, SseConnectionService.MESSAGE_EVENT, "payload");
            service.heartbeat();
        }).doesNotThrowAnyException();
    }

    @Test
    void unknownUserIsOfflineAndCanBeSkipped() {
        SseConnectionService service = new SseConnectionService();

        assertThat(service.isOnline(99L)).isFalse();
        assertThatCode(() -> service.sendToUser(
                99L, SseConnectionService.NOTIFICATION_EVENT, "payload"))
                .doesNotThrowAnyException();
    }
}
