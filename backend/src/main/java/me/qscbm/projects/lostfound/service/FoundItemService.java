package me.qscbm.projects.lostfound.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import me.qscbm.projects.lostfound.dto.FoundItemRequest;
import me.qscbm.projects.lostfound.dto.FoundItemVO;

public interface FoundItemService {
    IPage<FoundItemVO> page(int page, int size, String keyword, Long categoryId, String status);
    FoundItemVO getById(Long id);
    FoundItemVO create(Long userId, FoundItemRequest req);
    FoundItemVO update(Long id, Long userId, FoundItemRequest req);
    void delete(Long id, Long userId);
    void updateStatus(Long id, Long userId, String status, String resolvedType, Long resolvedBy, String resolvedNote);
}
