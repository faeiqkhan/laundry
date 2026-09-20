package com.faeiq.ClothNCare.auth.dto;

import com.faeiq.ClothNCare.user.entity.Role;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.Data;

@Data
public class RegisterDTO {
    private String name ;

    private String email;

    private String password;

    @Enumerated(EnumType.STRING)
    private Role role;
}
