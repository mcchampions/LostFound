package me.qscbm.projects.lostfound.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import me.qscbm.projects.lostfound.entity.FoundItem;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface FoundItemMapper extends BaseMapper<FoundItem> {
}
