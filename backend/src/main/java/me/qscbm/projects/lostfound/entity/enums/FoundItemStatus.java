package me.qscbm.projects.lostfound.entity.enums;

import com.baomidou.mybatisplus.annotation.EnumValue;

public enum FoundItemStatus {
    UNCLAIMED("UNCLAIMED"),
    CLAIMED("CLAIMED");

    @EnumValue
    private final String value;

    FoundItemStatus(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }
}
