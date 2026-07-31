package me.qscbm.projects.lostfound.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateProfileRequest {
    @Size(min = 1, max = 50)
    private String realName;
    @Email
    @Size(max = 100)
    private String email;
    @Pattern(regexp = "^(\\+\\d{1,4} \\d{5,15}|\\d{5,15})?$",
            message = "手机号格式不正确，需为区号+纯数字号码")
    @Size(max = 20)
    private String phone;
    @Size(max = 500)
    private String avatar;
}
