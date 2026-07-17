package com.splitsmart.service;

import com.splitsmart.dto.*;
import com.splitsmart.model.*;
import com.splitsmart.repository.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExpenseService {

    private final ExpenseRepository expenseRepository;
    private final ExpenseSplitRepository expenseSplitRepository;
    private final GroupRepository groupRepository;
    private final UserRepository userRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final GroupService groupService;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public ExpenseDTO addExpense(AddExpenseRequest req, User currentUser) {
        Group group = groupRepository.findById(req.getGroupId())
                .orElseThrow(() -> new RuntimeException("Group not found"));

        User paidBy = userRepository.findById(req.getPaidById())
                .orElseThrow(() -> new RuntimeException("Payer not found"));

        Expense expense = Expense.builder()
                .group(group)
                .description(req.getDescription())
                .amount(req.getAmount())
                .paidBy(paidBy)
                .splitType(req.getSplitType())
                .build();

        expense = expenseRepository.save(expense);

        // Compute and save splits
        List<ExpenseSplit> splits = computeSplits(expense, req);
        expenseSplitRepository.saveAll(splits);

        // Build DTO for broadcast
        ExpenseDTO dto = toDTO(expense, splits);

        // Broadcast to all group members via WebSocket
        messagingTemplate.convertAndSend("/topic/group/" + group.getId(), dto);

        // Broadcast updated balances
        List<BalanceDTO> balances = groupService.getBalances(group.getId());
        messagingTemplate.convertAndSend("/topic/balance/" + group.getId(), balances);

        log.info("Expense '{}' (₹{}) added to group {}", req.getDescription(), req.getAmount(), group.getId());
        return dto;
    }

    public List<ExpenseDTO> getExpensesForGroup(Long groupId) {
        List<Expense> expenses = expenseRepository.findByGroupIdOrderByCreatedAt(groupId);
        return expenses.stream().map(expense -> {
            List<ExpenseSplit> splits = expenseSplitRepository.findByExpenseId(expense.getId());
            return toDTO(expense, splits);
        }).collect(Collectors.toList());
    }

    private List<ExpenseSplit> computeSplits(Expense expense, AddExpenseRequest req) {
        switch (req.getSplitType()) {
            case EQUAL -> {
                List<Long> ids = req.getMemberIds();
                if (ids == null || ids.isEmpty()) throw new RuntimeException("memberIds required for EQUAL split");
                BigDecimal each = expense.getAmount()
                        .divide(BigDecimal.valueOf(ids.size()), 2, RoundingMode.HALF_UP);
                return ids.stream().map(uid -> {
                    User u = userRepository.findById(uid).orElseThrow();
                    return ExpenseSplit.builder().expense(expense).user(u).amountOwed(each).build();
                }).collect(Collectors.toList());
            }
            case CUSTOM -> {
                Map<Long, BigDecimal> custom = req.getCustomSplits();
                if (custom == null || custom.isEmpty()) throw new RuntimeException("customSplits required for CUSTOM split");
                return custom.entrySet().stream().map(e -> {
                    User u = userRepository.findById(e.getKey()).orElseThrow();
                    return ExpenseSplit.builder().expense(expense).user(u).amountOwed(e.getValue()).build();
                }).collect(Collectors.toList());
            }
            case PERCENTAGE -> {
                Map<Long, Double> pct = req.getPercentageSplits();
                if (pct == null || pct.isEmpty()) throw new RuntimeException("percentageSplits required for PERCENTAGE split");
                return pct.entrySet().stream().map(e -> {
                    User u = userRepository.findById(e.getKey()).orElseThrow();
                    BigDecimal owed = expense.getAmount()
                            .multiply(BigDecimal.valueOf(e.getValue() / 100.0))
                            .setScale(2, RoundingMode.HALF_UP);
                    return ExpenseSplit.builder().expense(expense).user(u).amountOwed(owed).build();
                }).collect(Collectors.toList());
            }
            default -> throw new RuntimeException("Unknown split type");
        }
    }

    private ExpenseDTO toDTO(Expense expense, List<ExpenseSplit> splits) {
        List<ExpenseDTO.SplitEntry> splitEntries = splits.stream()
                .map(s -> ExpenseDTO.SplitEntry.builder()
                        .userId(s.getUser().getId())
                        .userName(s.getUser().getName())
                        .avatarColor(s.getUser().getAvatarColor())
                        .amountOwed(s.getAmountOwed())
                        .build())
                .collect(Collectors.toList());

        return ExpenseDTO.builder()
                .id(expense.getId())
                .description(expense.getDescription())
                .amount(expense.getAmount())
                .paidById(expense.getPaidBy().getId())
                .paidByName(expense.getPaidBy().getName())
                .paidByAvatar(expense.getPaidBy().getAvatarColor())
                .splitType(expense.getSplitType().name())
                .splits(splitEntries)
                .createdAt(expense.getCreatedAt())
                .build();
    }
}
