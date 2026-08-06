package me.qscbm.projects.lostfound.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.List;

@Data
@AllArgsConstructor
public class MessageBatchVO {
    private List<MessageVO> records;
    private boolean hasMore;
}
