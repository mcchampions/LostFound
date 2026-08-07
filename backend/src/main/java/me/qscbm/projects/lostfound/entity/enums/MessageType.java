package me.qscbm.projects.lostfound.entity.enums;

public enum MessageType {
    USER("USER"),
    NARRATION("NARRATION");

    private final String value;

    MessageType(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}
