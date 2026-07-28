package me.qscbm.projects.lostfound.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import me.qscbm.projects.lostfound.dto.ClaimRequest;
import me.qscbm.projects.lostfound.dto.ClaimVO;

public interface ClaimService {
    ClaimVO apply(Long applicantId, ClaimRequest req);
    IPage<ClaimVO> received(Long userId, int page, int size, String status);
    IPage<ClaimVO> sent(Long userId, int page, int size, String status);
    void process(Long id, Long userId, String status);
}
