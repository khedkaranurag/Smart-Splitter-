package com.splitsmart.service;

import com.splitsmart.dto.BalanceDTO;
import com.splitsmart.dto.TransactionDTO;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

/**
 * Graph Cash-Flow Minimization Algorithm
 * ----------------------------------------
 * Given each person's net balance (paid - owed), this greedy algorithm
 * computes the minimum number of transactions to settle all debts.
 *
 * Time Complexity:  O(N log N) per settlement
 * Space Complexity: O(N)
 * Max transactions: N - 1  (theoretical minimum for N people)
 */
@Component
public class SettlementAlgorithm {

    private static final BigDecimal EPSILON = new BigDecimal("0.005");

    /**
     * @param balances list of BalanceDTO where netBalance > 0 = creditor, < 0 = debtor
     * @return minimum set of transactions to zero out all balances
     */
    public List<TransactionDTO> minimize(List<BalanceDTO> balances) {
        // Max-heap for creditors (largest credit first)
        PriorityQueue<BalanceDTO> creditors = new PriorityQueue<>(
                Comparator.comparing(BalanceDTO::getNetBalance).reversed()
        );
        // Min-heap for debtors (largest debt first, i.e. most negative)
        PriorityQueue<BalanceDTO> debtors = new PriorityQueue<>(
                Comparator.comparing(BalanceDTO::getNetBalance)
        );

        for (BalanceDTO b : balances) {
            if (b.getNetBalance().compareTo(EPSILON) > 0) {
                creditors.add(cloneBalance(b));
            } else if (b.getNetBalance().compareTo(EPSILON.negate()) < 0) {
                debtors.add(cloneBalance(b));
            }
        }

        List<TransactionDTO> result = new ArrayList<>();

        while (!creditors.isEmpty() && !debtors.isEmpty()) {
            BalanceDTO creditor = creditors.poll();
            BalanceDTO debtor   = debtors.poll();

            // Amount settled = min(what creditor is owed, what debtor owes)
            BigDecimal credit = creditor.getNetBalance();
            BigDecimal debt   = debtor.getNetBalance().negate(); // make positive
            BigDecimal amount = credit.min(debt).setScale(2, RoundingMode.HALF_UP);

            result.add(TransactionDTO.builder()
                    .fromUserId(debtor.getUserId())
                    .fromUserName(debtor.getUserName())
                    .fromUserAvatar(debtor.getAvatarColor())
                    .toUserId(creditor.getUserId())
                    .toUserName(creditor.getUserName())
                    .toUserAvatar(creditor.getAvatarColor())
                    .amount(amount)
                    .build());

            BigDecimal newCredit = credit.subtract(amount);
            BigDecimal newDebt   = debt.subtract(amount).negate(); // back to negative

            if (newCredit.compareTo(EPSILON) > 0) {
                creditor.setNetBalance(newCredit);
                creditors.add(creditor);
            }
            if (newDebt.compareTo(EPSILON.negate()) < 0) {
                debtor.setNetBalance(newDebt);
                debtors.add(debtor);
            }
        }

        return result;
    }

    private BalanceDTO cloneBalance(BalanceDTO b) {
        return BalanceDTO.builder()
                .userId(b.getUserId())
                .userName(b.getUserName())
                .avatarColor(b.getAvatarColor())
                .netBalance(b.getNetBalance())
                .build();
    }
}
