package me.qscbm.projects.lostfound.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateProfileRequest {
    @Size(min = 1, max = 50)
    private String realName;
    @Email
    @Size(max = 100)
    private String email;
    @Size(max = 20)
    private String phone;
    @Size(max = 500)
    private String avatar;
}
