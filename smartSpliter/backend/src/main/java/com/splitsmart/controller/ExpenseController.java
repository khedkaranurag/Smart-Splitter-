package com.splitsmart.controller;

import com.splitsmart.dto.*;
import com.splitsmart.model.User;
import com.splitsmart.service.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/expenses")
@RequiredArgsConstructor
public class ExpenseController {

    private final ExpenseService expenseService;
    private final AuthService authService;

    @PostMapping
    public ResponseEntity<ApiResponse<ExpenseDTO>> addExpense(
            @Valid @RequestBody AddExpenseRequest request,
            Authentication auth) {
        User currentUser = authService.getUserByEmail(auth.getName());
        ExpenseDTO expense = expenseService.addExpense(request, currentUser);
        return ResponseEntity.ok(ApiResponse.ok("Expense added", expense));
    }

    @GetMapping("/group/{groupId}")
    public ResponseEntity<ApiResponse<List<ExpenseDTO>>> getGroupExpenses(@PathVariable Long groupId) {
        List<ExpenseDTO> expenses = expenseService.getExpensesForGroup(groupId);
        return ResponseEntity.ok(ApiResponse.ok(expenses));
    }
}
