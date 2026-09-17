package com.faeiq.ClothNCare.auth.repository;

import com.faeiq.ClothNCare.auth.entity.RefreshSession;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RefreshSessionRepository extends JpaRepository<RefreshSession, String> {
    Optional<RefreshSession> findByTokenHash(String tokenHash);
    void deleteByTokenHash(String tokenHash);
}
