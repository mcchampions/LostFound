package me.qscbm.projects.lostfound.service.impl;

import me.qscbm.projects.lostfound.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class OfflineMessageEmailTrackerTest {

    private AsyncMailSender asyncMailSender;
    private OfflineMessageEmailTracker tracker;

    @BeforeEach
    void setUp() {
        asyncMailSender = mock(AsyncMailSender.class);
        tracker = new OfflineMessageEmailTracker(asyncMailSender);
    }

    private User user(Long id) {
        User user = new User();
        user.setId(id);
        return user;
    }

    @Test
    void collectsConversationsWhenEligibleAndNotYetSent() {
        when(asyncMailSender.canReceiveEmail(any(), eq("message"))).thenReturn(true);

        tracker.collectIfEligible(user(1L), "1_2");
        tracker.collectIfEligible(user(1L), "2_3");

        assertThat(tracker.conversationIdsOf(1L)).containsExactlyInAnyOrder("1_2", "2_3");
    }

    @Test
    void skipsCollectionAfterEmailWasSent() {
        when(asyncMailSender.canReceiveEmail(any(), eq("message"))).thenReturn(true);
        tracker.collectIfEligible(user(1L), "1_2");
        tracker.markSent(1L);

        tracker.collectIfEligible(user(1L), "2_3");

        assertThat(tracker.conversationIdsOf(1L)).isNull();
    }

    @Test
    void skipsCollectionWhenNotEligible() {
        when(asyncMailSender.canReceiveEmail(any(), eq("message"))).thenReturn(false);

        tracker.collectIfEligible(user(1L), "1_2");

        assertThat(tracker.conversationIdsOf(1L)).isNull();
    }

    @Test
    void resetStatusAllowsNextRoundCollection() {
        when(asyncMailSender.canReceiveEmail(any(), eq("message"))).thenReturn(true);
        tracker.collectIfEligible(user(1L), "1_2");
        tracker.markSent(1L);

        assertThat(tracker.tryMarkSending(1L)).isFalse();
        tracker.resetStatus(1L);
        tracker.collectIfEligible(user(1L), "2_3");

        assertThat(tracker.conversationIdsOf(1L)).containsExactly("2_3");
        assertThat(tracker.tryMarkSending(1L)).isTrue();
    }

    @Test
    void clearAllStatesAllowsReminderAfter24Hours() {
        when(asyncMailSender.canReceiveEmail(any(), eq("message"))).thenReturn(true);
        tracker.collectIfEligible(user(1L), "1_2");
        tracker.markSent(1L);

        tracker.clearAllStates();
        tracker.collectIfEligible(user(1L), "3_4");

        assertThat(tracker.conversationIdsOf(1L)).containsExactly("3_4");
    }

    @Test
    void resetForRetryKeepsConversationsForNextRound() {
        when(asyncMailSender.canReceiveEmail(any(), eq("message"))).thenReturn(true);
        tracker.collectIfEligible(user(1L), "1_2");

        assertThat(tracker.tryMarkSending(1L)).isTrue();
        tracker.resetForRetry(1L);

        assertThat(tracker.conversationIdsOf(1L)).containsExactly("1_2");
        assertThat(tracker.tryMarkSending(1L)).isTrue();
    }
}
