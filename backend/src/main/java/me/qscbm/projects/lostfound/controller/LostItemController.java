package me.qscbm.projects.lostfound.controller;

import lombok.RequiredArgsConstructor;
import me.qscbm.projects.lostfound.dto.LostItemRequest;
import me.qscbm.projects.lostfound.dto.LostItemVO;
import me.qscbm.projects.lostfound.service.LostItemService;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/lost-items")
@RequiredArgsConstructor
@Validated
public class LostItemController extends AbstractItemController<LostItemRequest, LostItemVO> {

    private final LostItemService lostItemService;

    @Override
    protected LostItemService itemService() {
        return lostItemService;
    }
}
