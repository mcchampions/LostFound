package me.qscbm.projects.lostfound.common;

import me.qscbm.projects.lostfound.dto.UserVO;
import me.qscbm.projects.lostfound.entity.User;

public final class UserVOMapper {

    private UserVOMapper() {
    }

    public static UserVO toVO(User user) {
        return UserVO.builder()
                .id(user.getId()).username(user.getUsername())
                .realName(user.getRealName()).role(user.getRole())
                .email(user.getEmail()).phone(user.getPhone())
                .avatar(user.getAvatar()).status(user.getStatus()).build();
    }
}
