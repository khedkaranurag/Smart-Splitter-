package com.splitsmart.repository;

import com.splitsmart.model.ExpenseSplit;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ExpenseSplitRepository extends JpaRepository<ExpenseSplit, Long> {
    List<ExpenseSplit> findByExpenseId(Long expenseId);

    @Query("SELECT es FROM ExpenseSplit es WHERE es.expense.group.id = :groupId")
    List<ExpenseSplit> findByGroupId(@Param("groupId") Long groupId);
}
