package me.qscbm.projects.lostfound.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {
    @NotBlank @Size(min = 3, max = 50)
    private String username;
    @NotBlank @Size(min = 6, max = 100)
    private String password;
    @NotBlank @Size(min = 1, max = 50)
    private String realName;
    @NotBlank
    @Pattern(regexp = "STUDENT|TEACHER", message = "角色只能是 STUDENT 或 TEACHER")
    private String role;
    @Email
    private String email;
    private String phone;
}
