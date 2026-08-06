package me.qscbm.projects.lostfound.common;

public final class ExcelCellSanitizer {
    private ExcelCellSanitizer() {
    }

    public static String safeCell(String value) {
        if (value == null) return "";
        return value.matches("^[=+@\\-\\t\\r].*") ? "'" + value : value;
    }
}
