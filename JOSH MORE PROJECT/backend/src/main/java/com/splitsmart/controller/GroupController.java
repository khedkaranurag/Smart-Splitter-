package com.splitsmart.controller;

import com.splitsmart.dto.*;
import com.splitsmart.model.*;
import com.splitsmart.service.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/groups")
@RequiredArgsConstructor
public class GroupController {

    private final GroupService groupService;
    private final AuthService authService;

    @PostMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> createGroup(
            @Valid @RequestBody CreateGroupRequest request,
            Authentication auth) {
        User currentUser = authService.getUserByEmail(auth.getName());
        Group group = groupService.createGroup(request, currentUser);
        return ResponseEntity.ok(ApiResponse.ok("Group created", groupToMap(group)));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getMyGroups(Authentication auth) {
        User currentUser = authService.getUserByEmail(auth.getName());
        List<Group> groups = groupService.getGroupsForUser(currentUser);
        List<Map<String, Object>> result = groups.stream().map(this::groupToMap).collect(Collectors.toList());
        return ResponseEntity.ok(ApiResponse.ok(result));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getGroup(@PathVariable Long id) {
        Group group = groupService.getGroupById(id);
        List<GroupMember> members = groupService.getMembersForGroup(id);

        Map<String, Object> data = groupToMap(group);
        data.put("members", members.stream().map(gm -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("id", gm.getUser().getId());
            m.put("name", gm.getUser().getName());
            m.put("email", gm.getUser().getEmail());
            m.put("avatarColor", gm.getUser().getAvatarColor());
            m.put("joinedAt", gm.getJoinedAt());
            return m;
        }).collect(Collectors.toList()));

        return ResponseEntity.ok(ApiResponse.ok(data));
    }

    @PostMapping("/{id}/invite")
    public ResponseEntity<ApiResponse<Void>> inviteMember(
            @PathVariable Long id,
            @RequestBody Map<String, String> body,
            Authentication auth) {
        String email = body.get("email");
        if (email == null || email.isBlank()) {
            return ResponseEntity.badRequest().body(ApiResponse.error("Email is required"));
        }
        User currentUser = authService.getUserByEmail(auth.getName());
        groupService.inviteMember(id, email.trim(), currentUser);
        return ResponseEntity.ok(ApiResponse.ok("Member added successfully", null));
    }

    @GetMapping("/{id}/balances")
    public ResponseEntity<ApiResponse<List<BalanceDTO>>> getBalances(@PathVariable Long id) {
        List<BalanceDTO> balances = groupService.getBalances(id);
        return ResponseEntity.ok(ApiResponse.ok(balances));
    }

    private Map<String, Object> groupToMap(Group group) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("id", group.getId());
        m.put("name", group.getName());
        m.put("type", group.getType().name());
        m.put("inviteCode", group.getInviteCode());
        m.put("archived", group.isArchived());
        m.put("createdAt", group.getCreatedAt());
        if (group.getCreatedBy() != null) {
            m.put("createdById", group.getCreatedBy().getId());
            m.put("createdByName", group.getCreatedBy().getName());
        }
        return m;
    }
}
