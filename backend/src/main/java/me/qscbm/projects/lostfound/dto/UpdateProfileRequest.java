package me.qscbm.projects.lostfound.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateProfileRequest {
    @Size(min = 1, max = 50)
    private String realName;
    @Email
    private String email;
    private String phone;
    private String avatar;
}
