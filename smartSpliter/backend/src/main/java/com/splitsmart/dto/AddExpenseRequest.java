package com.splitsmart.dto;

import com.splitsmart.model.Expense.SplitType;
import lombok.Data;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

@Data
public class AddExpenseRequest {

    @NotNull(message = "Group ID is required")
    private Long groupId;

    @NotBlank(message = "Description is required")
    private String description;

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
    private BigDecimal amount;

    @NotNull(message = "Paid by user ID is required")
    private Long paidById;

    @NotNull(message = "Split type is required")
    private SplitType splitType;

    // EQUAL: list of user IDs to split with
    private List<Long> memberIds;

    // CUSTOM: user ID → exact amount they owe
    private Map<Long, BigDecimal> customSplits;

    // PERCENTAGE: user ID → percentage (0-100)
    private Map<Long, Double> percentageSplits;
}
