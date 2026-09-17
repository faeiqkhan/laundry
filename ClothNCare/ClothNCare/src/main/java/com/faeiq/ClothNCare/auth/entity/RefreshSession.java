package com.faeiq.ClothNCare.auth.entity;

import com.faeiq.ClothNCare.user.entity.Users;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Data;

@Entity
@Table(name = "refresh_sessions")
@Data
public class RefreshSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String tokenHash;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private Users user;
}
