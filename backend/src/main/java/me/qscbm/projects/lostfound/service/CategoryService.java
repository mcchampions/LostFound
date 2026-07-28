package me.qscbm.projects.lostfound.service;

import me.qscbm.projects.lostfound.entity.Category;
import java.util.List;

public interface CategoryService {
    List<Category> list();
    Category create(String name, int sortOrder);
    Category update(Long id, String name, Integer sortOrder);
    void delete(Long id);
}
