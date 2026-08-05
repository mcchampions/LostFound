package me.qscbm.projects.lostfound.entity.enums;

import com.baomidou.mybatisplus.annotation.EnumValue;

public enum LostItemStatus {
    LOST("LOST"),
    FOUND("FOUND");

    @EnumValue
    private final String value;

    LostItemStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}
