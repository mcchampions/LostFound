package me.qscbm.projects.lostfound.controller;

import me.qscbm.projects.lostfound.mapper.FoundItemMapper;
import me.qscbm.projects.lostfound.mapper.LostItemMapper;
import me.qscbm.projects.lostfound.mapper.UserMapper;
import me.qscbm.projects.lostfound.service.OperationLogService;
import me.qscbm.projects.lostfound.service.StatsService;
import me.qscbm.projects.lostfound.service.UserService;
import me.qscbm.projects.lostfound.service.impl.OperationLogRecorder;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class AdminControllerTest {

    @Test
    void safeCellNeutralizesFormulaInjectionPrefixes() {
        assertThat(AdminController.safeCell("=1+1")).isEqualTo("'=1+1");
        assertThat(AdminController.safeCell("+123")).isEqualTo("'+123");
        assertThat(AdminController.safeCell("@cmd")).isEqualTo("'@cmd");
        assertThat(AdminController.safeCell("-1")).isEqualTo("'-1");
        assertThat(AdminController.safeCell("正常文本")).isEqualTo("正常文本");
        assertThat(AdminController.safeCell(null)).isEmpty();
    }

    @Test
    void controllerCanBeConstructedWithDependencies() {
        AdminController controller = new AdminController(
                mock(UserService.class),
                mock(StatsService.class),
                mock(OperationLogService.class),
                mock(LostItemMapper.class),
                mock(FoundItemMapper.class),
                mock(OperationLogRecorder.class),
                mock(UserMapper.class));
        assertThat(controller).isNotNull();
    }
}
