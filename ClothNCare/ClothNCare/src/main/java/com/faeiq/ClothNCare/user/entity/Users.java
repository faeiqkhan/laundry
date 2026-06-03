package com.faeiq.ClothNCare.user.entity;

import jakarta.persistence.*;
import lombok.Data;

@Entity
@Data
public class Users {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String name ;

    private String email;

    private String password;

    @Enumerated(EnumType.STRING)
    private Role role;


}
