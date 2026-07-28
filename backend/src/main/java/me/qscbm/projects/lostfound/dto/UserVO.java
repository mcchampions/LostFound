package me.qscbm.projects.lostfound.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class UserVO {
    private Long id;
    private String username;
    private String realName;
    private String role;
    private String email;
    private String phone;
    private String avatar;
    private String status;
}
