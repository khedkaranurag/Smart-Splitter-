package com.splitsmart.dto;

import lombok.*;
import java.math.BigDecimal;

@Data
@AllArgsConstructor
@NoArgsConstructor
@Builder
public class BalanceDTO {
    private Long userId;
    private String userName;
    private String avatarColor;
    // positive = others owe this person, negative = this person owes others
    private BigDecimal netBalance;
}
