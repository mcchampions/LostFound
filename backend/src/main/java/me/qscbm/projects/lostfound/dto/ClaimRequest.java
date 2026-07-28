package me.qscbm.projects.lostfound.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class ClaimRequest {
    @NotBlank
    @Pattern(regexp = "LOST|FOUND", message = "物品类型只能是 LOST 或 FOUND")
    private String itemType;
    @NotNull
    private Long itemId;
    private String message;
    private String imageUrls;
}
