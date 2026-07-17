package com.splitsmart.service;

import com.splitsmart.dto.*;
import com.splitsmart.model.*;
import com.splitsmart.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GroupService {

    private final GroupRepository groupRepository;
    private final GroupMemberRepository groupMemberRepository;
    private final UserRepository userRepository;
    private final ExpenseRepository expenseRepository;
    private final ExpenseSplitRepository expenseSplitRepository;
    private final EmailService emailService;

    @Transactional
    public Group createGroup(CreateGroupRequest request, User creator) {
        String inviteCode = generateInviteCode();

        Group group = Group.builder()
                .name(request.getName())
                .type(request.getType())
                .inviteCode(inviteCode)
                .createdBy(creator)
                .build();

        group = groupRepository.save(group);

        // Add creator as first member
        groupMemberRepository.save(GroupMember.builder()
                .group(group)
                .user(creator)
                .build());

        // Invite additional members if provided
        if (request.getMemberEmails() != null) {
            final Group savedGroup = group;
            for (String email : request.getMemberEmails()) {
                userRepository.findByEmail(email.trim()).ifPresent(user -> {
                    if (!groupMemberRepository.existsByGroupIdAndUserId(savedGroup.getId(), user.getId())) {
                        groupMemberRepository.save(GroupMember.builder()
                                .group(savedGroup)
                                .user(user)
                                .build());
                        
                        // Send invitation email
                        emailService.sendInvitationEmail(user.getEmail(), savedGroup.getName(), creator.getName());
                    }
                });
            }
        }

        return group;
    }

    public List<Group> getGroupsForUser(User user) {
        return groupRepository.findActiveGroupsByUserId(user.getId());
    }

    public Group getGroupById(Long groupId) {
        return groupRepository.findById(groupId)
                .orElseThrow(() -> new RuntimeException("Group not found: " + groupId));
    }

    public List<GroupMember> getMembersForGroup(Long groupId) {
        return groupMemberRepository.findByGroupId(groupId);
    }

    @Transactional
    public void inviteMember(Long groupId, String email, User inviter) {
        Group group = getGroupById(groupId);
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + email));

        if (groupMemberRepository.existsByGroupIdAndUserId(groupId, user.getId())) {
            throw new RuntimeException("User is already a member of this group");
        }

        groupMemberRepository.save(GroupMember.builder()
                .group(group)
                .user(user)
                .build());
                
        // Send invitation email
        emailService.sendInvitationEmail(user.getEmail(), group.getName(), inviter.getName());
    }

    /**
     * Calculate net balance for each member in the group.
     * net > 0  → creditor (others owe them)
     * net < 0  → debtor (they owe others)
     */
    public List<BalanceDTO> getBalances(Long groupId) {
        List<GroupMember> members = getMembersForGroup(groupId);
        Map<Long, BigDecimal> balanceMap = new HashMap<>();

        // Initialize balances to 0
        for (GroupMember gm : members) {
            balanceMap.put(gm.getUser().getId(), BigDecimal.ZERO);
        }

        // Add what each person paid
        List<Expense> expenses = expenseRepository.findByGroupIdOrderByCreatedAt(groupId);
        for (Expense expense : expenses) {
            Long payerId = expense.getPaidBy().getId();
            balanceMap.merge(payerId, expense.getAmount(), BigDecimal::add);
        }

        // Subtract what each person owes
        List<ExpenseSplit> splits = expenseSplitRepository.findByGroupId(groupId);
        for (ExpenseSplit split : splits) {
            Long userId = split.getUser().getId();
            balanceMap.merge(userId, split.getAmountOwed().negate(), BigDecimal::add);
        }

        // Build DTO list sorted by net balance descending
        Map<Long, User> userMap = members.stream()
                .collect(Collectors.toMap(gm -> gm.getUser().getId(), GroupMember::getUser));

        return balanceMap.entrySet().stream()
                .map(entry -> BalanceDTO.builder()
                        .userId(entry.getKey())
                        .userName(userMap.get(entry.getKey()).getName())
                        .avatarColor(userMap.get(entry.getKey()).getAvatarColor())
                        .netBalance(entry.getValue().setScale(2, java.math.RoundingMode.HALF_UP))
                        .build())
                .sorted(Comparator.comparing(BalanceDTO::getNetBalance).reversed())
                .collect(Collectors.toList());
    }

    @Transactional
    public void archiveGroup(Long groupId) {
        Group group = getGroupById(groupId);
        group.setArchived(true);
        groupRepository.save(group);
    }

    private String generateInviteCode() {
        String chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        StringBuilder sb = new StringBuilder();
        Random random = new Random();
        for (int i = 0; i < 8; i++) {
            sb.append(chars.charAt(random.nextInt(chars.length())));
        }
        return sb.toString();
    }

    public boolean isMember(Long groupId, Long userId) {
        return groupMemberRepository.existsByGroupIdAndUserId(groupId, userId);
    }
}
