package me.qscbm.projects.lostfound.entity.enums;

public enum ClaimStatus {
    PENDING("PENDING"),
    APPROVED("APPROVED"),
    REJECTED("REJECTED");

    private final String value;

    ClaimStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}
