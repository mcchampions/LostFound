package me.qscbm.projects.lostfound.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;
import me.qscbm.projects.lostfound.entity.OperationLog;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface OperationLogMapper extends BaseMapper<OperationLog> {
}
