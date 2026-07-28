package me.qscbm.projects.lostfound.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import me.qscbm.projects.lostfound.dto.LostItemRequest;
import me.qscbm.projects.lostfound.dto.LostItemVO;

public interface LostItemService {
    IPage<LostItemVO> page(int page, int size, String keyword, Long categoryId, String status);
    LostItemVO getById(Long id);
    LostItemVO create(Long userId, LostItemRequest req);
    LostItemVO update(Long id, Long userId, LostItemRequest req);
    void delete(Long id, Long userId);
    void updateStatus(Long id, Long userId, String status);
    void updateStatus(Long id, Long userId, String status, String resolvedType, Long resolvedBy, String resolvedNote);
}
