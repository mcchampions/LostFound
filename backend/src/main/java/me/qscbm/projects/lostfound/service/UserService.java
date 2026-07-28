package me.qscbm.projects.lostfound.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import me.qscbm.projects.lostfound.dto.UpdateProfileRequest;
import me.qscbm.projects.lostfound.dto.UserVO;

public interface UserService {
    UserVO getProfile(Long userId);
    UserVO updateProfile(Long userId, UpdateProfileRequest req);
    IPage<UserVO> listUsers(int page, int size, String keyword);
    void updateStatus(Long userId, String status);
    void changePassword(Long userId, String oldPassword, String newPassword);
    void sendVerifyCode(Long userId);
    void verifyEmail(Long userId, String code);
}
