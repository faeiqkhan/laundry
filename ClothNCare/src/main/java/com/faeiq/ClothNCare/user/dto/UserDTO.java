package com.faeiq.ClothNCare.user.dto;

import com.faeiq.ClothNCare.user.entity.Role;
import lombok.Data;

@Data
public class UserDTO {
    private String name;
    private String email;
    private String password;
    private Role role;
}
