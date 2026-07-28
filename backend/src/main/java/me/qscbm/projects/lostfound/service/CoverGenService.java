package me.qscbm.projects.lostfound.service;

import me.qscbm.projects.lostfound.dto.CoverGenRequest;

public interface CoverGenService {
    /**
     * Generate a text-based cover image and return its /uploads/ URL.
     */
    String generate(Long userId, CoverGenRequest req);
}
