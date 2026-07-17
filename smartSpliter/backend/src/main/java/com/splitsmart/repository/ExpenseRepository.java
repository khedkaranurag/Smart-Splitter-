package com.splitsmart.repository;

import com.splitsmart.model.Expense;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface ExpenseRepository extends JpaRepository<Expense, Long> {
    @Query("SELECT e FROM Expense e WHERE e.group.id = :groupId ORDER BY e.createdAt ASC")
    List<Expense> findByGroupIdOrderByCreatedAt(@Param("groupId") Long groupId);
}
