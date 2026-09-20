package com.faeiq.ClothNCare.user.dto;

import com.faeiq.ClothNCare.user.entity.Role;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UserResponseDTO {
    private String id;
    private String name;
    private String email;
    private Role role;
}
