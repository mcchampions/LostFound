package me.qscbm.projects.lostfound.service.impl;

import me.qscbm.projects.lostfound.common.BusinessException;
import me.qscbm.projects.lostfound.dto.ClaimRequest;
import me.qscbm.projects.lostfound.entity.ClaimApplication;
import me.qscbm.projects.lostfound.entity.FoundItem;
import me.qscbm.projects.lostfound.entity.Notification;
import me.qscbm.projects.lostfound.entity.User;
import me.qscbm.projects.lostfound.mapper.ClaimApplicationMapper;
import me.qscbm.projects.lostfound.mapper.FoundItemMapper;
import me.qscbm.projects.lostfound.mapper.LostItemMapper;
import me.qscbm.projects.lostfound.mapper.NotificationMapper;
import me.qscbm.projects.lostfound.mapper.UserMapper;
import me.qscbm.projects.lostfound.service.MessageService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class ClaimServiceImplTest {

    private ClaimApplicationMapper claimMapper;
    private LostItemMapper lostItemMapper;
    private FoundItemMapper foundItemMapper;
    private UserMapper userMapper;
    private NotificationMapper notificationMapper;
    private MessageService messageService;
    private ClaimServiceImpl service;

    @BeforeEach
    void setUp() {
        claimMapper = mock(ClaimApplicationMapper.class);
        lostItemMapper = mock(LostItemMapper.class);
        foundItemMapper = mock(FoundItemMapper.class);
        userMapper = mock(UserMapper.class);
        notificationMapper = mock(NotificationMapper.class);
        messageService = mock(MessageService.class);
        service = new ClaimServiceImpl(
                claimMapper,
                lostItemMapper,
                foundItemMapper,
                userMapper,
                notificationMapper,
                messageService
        );
    }

    @Test
    void duplicatePendingClaimIsRejected() {
        when(claimMapper.selectCount(any())).thenReturn(1L);

        assertThatThrownBy(() -> service.apply(2L, claimRequest()))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("已经对该物品提交过认领申请");
        verify(foundItemMapper, never()).selectById(any());
        verify(claimMapper, never()).insert(any());
    }

    @Test
    void nonPublisherCannotProcessClaim() {
        ClaimApplication claim = pendingClaim();
        when(claimMapper.selectById(10L)).thenReturn(claim);

        assertThatThrownBy(() -> service.process(10L, 99L, "APPROVED"))
                .isInstanceOf(BusinessException.class)
                .hasMessage("无权处理该认领申请");
        verify(claimMapper, never()).updateById(any());
    }

    @Test
    void approvingFoundItemUpdatesStatusCreatesConversationAndNotification() {
        ClaimApplication claim = pendingClaim();
        FoundItem item = new FoundItem();
        item.setId(5L);
        item.setTitle("Black Wallet");
        item.setStatus("UNCLAIMED");
        when(claimMapper.selectById(10L)).thenReturn(claim);
        when(foundItemMapper.selectById(5L)).thenReturn(item);
        when(claimMapper.update(isNull(), any())).thenReturn(1);
        when(foundItemMapper.update(isNull(), any())).thenReturn(1);
        User publisher = new User();
        publisher.setId(1L);
        publisher.setRealName("Publisher");
        when(userMapper.selectById(1L)).thenReturn(publisher);

        service.process(10L, 1L, "APPROVED");

        assertThat(claim.getStatus()).isEqualTo("APPROVED");
        verify(claimMapper, times(2)).update(isNull(), any());
        verify(foundItemMapper).update(isNull(), any());
        verify(messageService).systemMessage(
                "claim_10",
                1L,
                2L,
                "认领申请已通过，现在可以开始对话了。"
        );
        verify(notificationMapper).insert(argThat(notification ->
                notification.getUserId().equals(2L)
                        && notification.getTitle().contains("已通过")
                        && notification.getContent().contains("认领申请")
                        && notification.getIsRead() == 0));
    }

    @Test
    void concurrentProcessingIsRejectedWhenConditionalUpdateLosesRace() {
        ClaimApplication claim = pendingClaim();
        when(claimMapper.selectById(10L)).thenReturn(claim);
        when(claimMapper.update(isNull(), any())).thenReturn(0);

        assertThatThrownBy(() -> service.process(10L, 1L, "APPROVED"))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("已被处理");
        verify(foundItemMapper, never()).selectById(any());
    }

    private ClaimRequest claimRequest() {
        ClaimRequest request = new ClaimRequest();
        request.setItemType("FOUND");
        request.setItemId(5L);
        request.setMessage("It is mine");
        return request;
    }

    private ClaimApplication pendingClaim() {
        ClaimApplication claim = new ClaimApplication();
        claim.setId(10L);
        claim.setItemType("FOUND");
        claim.setItemId(5L);
        claim.setApplicantId(2L);
        claim.setPublisherId(1L);
        claim.setStatus("PENDING");
        return claim;
    }
}
