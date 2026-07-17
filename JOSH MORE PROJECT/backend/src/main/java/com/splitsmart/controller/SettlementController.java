package com.splitsmart.controller;

import com.splitsmart.dto.*;
import com.splitsmart.service.SettlementService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/settle")
@RequiredArgsConstructor
public class SettlementController {

    private final SettlementService settlementService;

    /**
     * GET /api/settle/{groupId}
     * Runs the graph minimization algorithm and returns the optimized transaction list.
     * Does NOT persist anything — preview only.
     */
    @GetMapping("/{groupId}")
    public ResponseEntity<ApiResponse<List<TransactionDTO>>> getSettlement(@PathVariable Long groupId) {
        List<TransactionDTO> transactions = settlementService.computeSettlement(groupId);
        return ResponseEntity.ok(ApiResponse.ok(transactions));
    }

    /**
     * POST /api/settle/{groupId}/confirm
     * Persists all settlement transactions and archives the group.
     */
    @PostMapping("/{groupId}/confirm")
    public ResponseEntity<ApiResponse<Void>> confirmSettlement(@PathVariable Long groupId) {
        settlementService.confirmSettlement(groupId);
        return ResponseEntity.ok(ApiResponse.ok("Group settled and archived", null));
    }
}
