package com.splitsmart.repository;

import com.splitsmart.model.Group;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface GroupRepository extends JpaRepository<Group, Long> {
    Optional<Group> findByInviteCode(String inviteCode);

    @Query("SELECT DISTINCT gm.group FROM GroupMember gm WHERE gm.user.id = :userId AND gm.group.archived = false ORDER BY gm.group.createdAt DESC")
    List<Group> findActiveGroupsByUserId(@Param("userId") Long userId);
}
