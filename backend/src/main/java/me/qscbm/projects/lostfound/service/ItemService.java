package me.qscbm.projects.lostfound.service;

import com.baomidou.mybatisplus.core.metadata.IPage;

public interface ItemService<TRequest, TVO> {
    IPage<TVO> page(int page, int size, String keyword, Long categoryId, String status);
    TVO getById(Long id);
    TVO create(Long userId, TRequest request);
    TVO update(Long id, Long userId, TRequest request);
    void delete(Long id, Long userId);
    void updateStatus(Long id, Long userId, String status,
                      String resolvedType, Long resolvedBy, String resolvedNote);
    /** 回收站：分页查询已删除的物品。 */
    IPage<TVO> trashPage(int page, int size, String keyword);
    /** 回收站：恢复已删除的物品。 */
    void restore(Long id, Long operatorId);
    /** 回收站：彻底删除（存在申请记录时禁止）。 */
    void purge(Long id, Long operatorId);
}
