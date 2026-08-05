package me.qscbm.projects.lostfound.service;

import com.baomidou.mybatisplus.core.metadata.IPage;
import me.qscbm.projects.lostfound.dto.PublicProfileVO;
import me.qscbm.projects.lostfound.dto.UpdateProfileRequest;
import me.qscbm.projects.lostfound.dto.UserItemVO;
import me.qscbm.projects.lostfound.dto.UserVO;

import java.util.List;
import java.util.Map;

public interface UserService {
    UserVO getProfile(Long userId);
    UserVO updateProfile(Long userId, UpdateProfileRequest req);
    IPage<UserVO> listUsers(int page, int size, String keyword);
    void updateStatus(Long userId, String status);
    void changePassword(Long userId, String oldPassword, String newPassword);
    void sendVerifyCode(Long userId);
    void verifyEmail(Long userId, String code);
    List<Map<String, Object>> searchUsers(String query);
    Map<String, Object> getPreferences(Long userId);
    void updatePreferences(Long userId, Map<String, Object> values);
    Map<String, Object> getEmailPreferences(Long userId);
    void updateEmailPreferences(Long userId, Map<String, Object> values);
    PublicProfileVO getPublicProfile(Long userId);
    IPage<UserItemVO> getUserItems(Long userId, String scope, String type, int page, int size);
}
