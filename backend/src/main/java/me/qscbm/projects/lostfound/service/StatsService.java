package me.qscbm.projects.lostfound.service;

import java.util.Map;

public interface StatsService {
    Map<String, Object> getDashboard();
    java.util.List<Map<String, Object>> getDailyTrend(int days);
}
