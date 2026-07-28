package me.qscbm.projects.lostfound.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ClaimRequest {
    @NotBlank
    @Pattern(regexp = "LOST|FOUND", message = "物品类型只能是 LOST 或 FOUND")
    private String itemType;
    @NotNull
    private Long itemId;
    @Size(max = 5000)
    private String message;
    @Size(max = 5000)
    private String imageUrls;
}
