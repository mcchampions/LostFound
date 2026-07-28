package me.qscbm.projects.lostfound.entity.enums;

import com.baomidou.mybatisplus.annotation.EnumValue;
import com.fasterxml.jackson.annotation.JsonValue;

public enum ItemStatus {
    LOST("LOST"),
    FOUND("FOUND"),
    UNCLAIMED("UNCLAIMED"),
    CLAIMED("CLAIMED");

    @EnumValue
    @JsonValue
    private final String value;

    ItemStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}
