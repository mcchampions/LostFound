package me.qscbm.projects.lostfound.common;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CodeHasherTest {

    @Test
    void hashContainsSaltAndMatchesOriginalCode() {
        String hash = CodeHasher.hash("123456");
        assertThat(hash).contains(":");
        assertThat(CodeHasher.matches("123456", hash)).isTrue();
    }

    @Test
    void sameCodeProducesDifferentHashes() {
        assertThat(CodeHasher.hash("123456")).isNotEqualTo(CodeHasher.hash("123456"));
    }

    @Test
    void rejectsWrongCodeAndMalformedStoredValue() {
        String hash = CodeHasher.hash("123456");
        assertThat(CodeHasher.matches("000000", hash)).isFalse();
        assertThat(CodeHasher.matches("123456", "not-a-hash")).isFalse();
        assertThat(CodeHasher.matches(null, hash)).isFalse();
    }
}
