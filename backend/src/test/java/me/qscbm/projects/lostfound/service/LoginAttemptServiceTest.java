package me.qscbm.projects.lostfound.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

class LoginAttemptServiceTest {

    private LoginAttemptService service;

    @BeforeEach
    void setUp() {
        service = new LoginAttemptService();
        ReflectionTestUtils.setField(service, "maxFailures", 5);
        ReflectionTestUtils.setField(service, "lockoutMinutes", 15L);
        ReflectionTestUtils.setField(service, "ipMaxAttempts", 20);
        ReflectionTestUtils.setField(service, "ipWindowMinutes", 10L);
    }

    @Test
    void locksUsernameAfterMaxFailures() {
        for (int i = 0; i < 5; i++) {
            service.recordFailure("student", "1.2.3.4");
        }
        assertThat(service.isUsernameLocked("student")).isTrue();
        assertThat(service.remainingLockSeconds("student")).isGreaterThan(0);
    }

    @Test
    void doesNotLockBelowThreshold() {
        for (int i = 0; i < 4; i++) {
            service.recordFailure("student", "1.2.3.4");
        }
        assertThat(service.isUsernameLocked("student")).isFalse();
    }

    @Test
    void resetClearsFailureRecord() {
        for (int i = 0; i < 4; i++) {
            service.recordFailure("student", "1.2.3.4");
        }
        service.reset("student");
        for (int i = 0; i < 4; i++) {
            service.recordFailure("student", "1.2.3.4");
        }
        assertThat(service.isUsernameLocked("student")).isFalse();
    }

    @Test
    void blocksIpAfterMaxAttempts() {
        for (int i = 0; i < 20; i++) {
            service.recordFailure("user" + i, "9.9.9.9");
        }
        assertThat(service.isIpBlocked("9.9.9.9")).isTrue();
    }

    @Test
    void doesNotBlockIpBelowThreshold() {
        for (int i = 0; i < 19; i++) {
            service.recordFailure("user" + i, "9.9.9.9");
        }
        assertThat(service.isIpBlocked("9.9.9.9")).isFalse();
    }
}
