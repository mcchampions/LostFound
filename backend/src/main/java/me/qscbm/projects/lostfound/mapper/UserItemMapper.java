package me.qscbm.projects.lostfound.mapper;

import com.baomidou.mybatisplus.core.metadata.IPage;
import me.qscbm.projects.lostfound.dto.UserItemVO;
import me.qscbm.projects.lostfound.entity.enums.FoundItemStatus;
import me.qscbm.projects.lostfound.entity.enums.LostItemStatus;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.SelectProvider;

import java.util.Map;

@Mapper
public interface UserItemMapper {

    @SelectProvider(type = SqlProvider.class, method = "build")
    IPage<UserItemVO> selectUserItems(IPage<?> page,
                                      @Param("userId") Long userId,
                                      @Param("scope") String scope,
                                      @Param("type") String type);

    final class SqlProvider {
        private SqlProvider() {
        }

        public static String build(Map<String, Object> params) {
            String scope = (String) params.get("scope");
            String type = (String) params.get("type");
            boolean includeLost = "all".equals(type) || "lost".equals(type);
            boolean includeFound = "all".equals(type) || "found".equals(type);
            StringBuilder sql = new StringBuilder();
            if (includeLost) {
                sql.append(lostSql(scope));
            }
            if (includeLost && includeFound) {
                sql.append(" UNION ALL ");
            }
            if (includeFound) {
                sql.append(foundSql(scope));
            }
            sql.append(" ORDER BY created_at DESC, id DESC");
            return sql.toString();
        }

        private static String lostSql(String scope) {
            return "SELECT li.id, li.user_id, 'LOST' AS item_type, li.title, li.status, "
                    + "li.cover_image, li.location, li.created_at, li.lost_time AS event_time, "
                    + "li.lost_time_end AS event_time_end, "
                    + "COALESCE(NULLIF(p.real_name, ''), p.username) AS publisher_name, "
                    + "li.resolved_type, li.resolved_by, "
                    + "COALESCE(NULLIF(r.real_name, ''), r.username) AS resolved_by_name, "
                    + "li.resolved_note "
                    + "FROM lost_item li "
                    + "LEFT JOIN `user` p ON p.id = li.user_id "
                    + "LEFT JOIN `user` r ON r.id = li.resolved_by "
                    + "WHERE " + whereClause(scope, "li", LostItemStatus.FOUND.getValue());
        }

        private static String foundSql(String scope) {
            return "SELECT fi.id, fi.user_id, 'FOUND' AS item_type, fi.title, fi.status, "
                    + "fi.cover_image, fi.location, fi.created_at, fi.found_time AS event_time, "
                    + "fi.found_time_end AS event_time_end, "
                    + "COALESCE(NULLIF(p.real_name, ''), p.username) AS publisher_name, "
                    + "fi.resolved_type, fi.resolved_by, "
                    + "COALESCE(NULLIF(r.real_name, ''), r.username) AS resolved_by_name, "
                    + "fi.resolved_note "
                    + "FROM found_item fi "
                    + "LEFT JOIN `user` p ON p.id = fi.user_id "
                    + "LEFT JOIN `user` r ON r.id = fi.resolved_by "
                    + "WHERE " + whereClause(scope, "fi", FoundItemStatus.CLAIMED.getValue());
        }

        private static String whereClause(String scope, String alias, String resolvedStatus) {
            if ("helped".equals(scope)) {
                return alias + ".resolved_by = #{userId}";
            }
            if ("resolved".equals(scope)) {
                return alias + ".user_id = #{userId} AND "
                        + alias + ".status = '" + resolvedStatus + "'";
            }
            return alias + ".user_id = #{userId}";
        }
    }
}
