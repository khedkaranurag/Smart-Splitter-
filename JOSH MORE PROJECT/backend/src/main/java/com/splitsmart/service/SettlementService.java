package com.splitsmart.service;

import com.splitsmart.dto.*;
import com.splitsmart.model.*;
import com.splitsmart.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SettlementService {

    private final GroupService groupService;
    private final SettlementAlgorithm algorithm;
    private final SettlementRepository settlementRepository;
    private final GroupRepository groupRepository;
    private final UserRepository userRepository;

    /**
     * Run the minimization algorithm and return the optimized transaction list.
     * Does NOT persist — user must confirm via confirmSettlement().
     */
    public List<TransactionDTO> computeSettlement(Long groupId) {
        List<BalanceDTO> balances = groupService.getBalances(groupId);
        return algorithm.minimize(balances);
    }

    /**
     * Persist the settlement transactions and archive the group.
     */
    @Transactional
    public void confirmSettlement(Long groupId) {
        List<TransactionDTO> transactions = computeSettlement(groupId);
        Group group = groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found"));

        for (TransactionDTO tx : transactions) {
            User fromUser = userRepository.findById(tx.getFromUserId())
                    .orElseThrow(() -> new RuntimeException("User not found: " + tx.getFromUserId()));
            User toUser = userRepository.findById(tx.getToUserId())
                    .orElseThrow(() -> new RuntimeException("User not found: " + tx.getToUserId()));

            settlementRepository.save(Settlement.builder()
                    .group(group)
                    .fromUser(fromUser)
                    .toUser(toUser)
                    .amount(tx.getAmount())
                    .build());
        }

        // Archive group after settlement
        groupService.archiveGroup(groupId);
    }
}
