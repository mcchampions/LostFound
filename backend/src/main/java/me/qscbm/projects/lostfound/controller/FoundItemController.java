package me.qscbm.projects.lostfound.controller;

import lombok.RequiredArgsConstructor;
import me.qscbm.projects.lostfound.dto.FoundItemRequest;
import me.qscbm.projects.lostfound.dto.FoundItemVO;
import me.qscbm.projects.lostfound.service.FoundItemService;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/found-items")
@RequiredArgsConstructor
@Validated
public class FoundItemController extends AbstractItemController<FoundItemRequest, FoundItemVO> {

    private final FoundItemService foundItemService;

    @Override
    protected FoundItemService itemService() {
        return foundItemService;
    }
}
