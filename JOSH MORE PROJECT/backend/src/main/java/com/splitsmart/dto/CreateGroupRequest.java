package com.splitsmart.dto;

import com.splitsmart.model.Group.GroupType;
import lombok.Data;
import jakarta.validation.constraints.*;
import java.util.List;

@Data
public class CreateGroupRequest {
    @NotBlank(message = "Group name is required")
    private String name;

    @NotNull(message = "Group type is required")
    private GroupType type;

    // Optional list of member emails to invite immediately
    private List<String> memberEmails;
}
