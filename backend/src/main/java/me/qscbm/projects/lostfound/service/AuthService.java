package me.qscbm.projects.lostfound.service;

import me.qscbm.projects.lostfound.dto.*;

public interface AuthService {
    UserVO register(RegisterRequest req);
    LoginResponse login(LoginRequest req);
    LoginResponse refresh(Long userId);
    LoginResponse adminLogin(LoginRequest req);
}
