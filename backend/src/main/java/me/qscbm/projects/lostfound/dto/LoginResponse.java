package me.qscbm.projects.lostfound.dto;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class LoginResponse {
    @JsonIgnore
    private String token;
    private UserVO user;
}
