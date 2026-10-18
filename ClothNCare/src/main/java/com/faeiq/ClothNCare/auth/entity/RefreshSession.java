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

import java.time.Instant;

@Entity
@Table(name = "refresh_sessions")
@Data
public class RefreshSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    private String tokenHash;

    // Absolute expiry of this refresh session. Rows created before this
    // column existed have NULL and are treated as expired. (Column name
    // maps to expires_at via the default naming strategy.)
    private Instant expiresAt;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private Users user;
}
