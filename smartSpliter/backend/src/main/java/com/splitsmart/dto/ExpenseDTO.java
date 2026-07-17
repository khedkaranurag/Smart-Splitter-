package com.splitsmart.dto;

import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class ExpenseDTO {
    private Long id;
    private String description;
    private BigDecimal amount;
    private Long paidById;
    private String paidByName;
    private String paidByAvatar;
    private String splitType;
    private List<SplitEntry> splits;
    private LocalDateTime createdAt;

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    @Builder
    public static class SplitEntry {
        private Long userId;
        private String userName;
        private String avatarColor;
        private BigDecimal amountOwed;
    }
}
