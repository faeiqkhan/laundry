package com.faeiq.ClothNCare.auth.service;

import com.faeiq.ClothNCare.auth.dto.AuthResponseDTO;
import com.faeiq.ClothNCare.auth.dto.LoginDTO;
import com.faeiq.ClothNCare.auth.dto.RegisterDTO;
import com.faeiq.ClothNCare.auth.security.JwtUtil;
import com.faeiq.ClothNCare.auth.entity.RefreshSession;
import com.faeiq.ClothNCare.auth.repository.RefreshSessionRepository;
import com.faeiq.ClothNCare.common.exception.ConflictException;
import com.faeiq.ClothNCare.common.exception.ResourceNotFoundException;
import com.faeiq.ClothNCare.common.exception.UnauthorizedException;
import com.faeiq.ClothNCare.user.entity.Role;
import com.faeiq.ClothNCare.user.entity.Users;
import com.faeiq.ClothNCare.user.repository.UsersRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final JwtUtil jwtUtil;
    private final UsersRepository usersRepository;
    private final RefreshSessionRepository refreshSessionRepository;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);
    private final SecureRandom secureRandom = new SecureRandom();

    // Refresh sessions live 30 days; expired sessions are purged on login.
    private static final Duration REFRESH_TOKEN_TTL = Duration.ofDays(30);

    @Transactional
    public void register(RegisterDTO registerDTO) {
        Users existingUser = usersRepository.findByEmail(registerDTO.getEmail());
        if (existingUser != null) {
            throw new ConflictException("User already exists");
        }

        Users user = new Users();
        user.setEmail(registerDTO.getEmail());
        user.setName(registerDTO.getName());
        user.setRole(safeRegisterRole(registerDTO.getRole()));
        user.setPassword(encoder.encode(registerDTO.getPassword()));

        usersRepository.save(user);
    }

    private Role safeRegisterRole(Role requestedRole) {
        // Public registration must never be able to self-assign elevated roles.
        return requestedRole == Role.MANAGER ? Role.MANAGER : Role.STAFF;
    }

    @Transactional(readOnly = true)
    public AuthResponseDTO login(LoginDTO loginDTO) {
        Users user = usersRepository.findByEmail(loginDTO.getEmail());

        if (user == null) {
            // Same message as a wrong password so login cannot reveal
            // which emails exist (user enumeration).
            throw new UnauthorizedException("Invalid email or password");
        }

        if (!encoder.matches(loginDTO.getPassword(), user.getPassword())) {
            throw new UnauthorizedException("Invalid email or password");
        }

        return new AuthResponseDTO(jwtUtil.generateToken(user), createRefreshToken(user));
    }

    @Transactional
    public AuthResponseDTO refresh(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            throw new UnauthorizedException("Refresh token is required");
        }

        RefreshSession session = refreshSessionRepository.findByTokenHash(hash(refreshToken))
                .orElseThrow(() -> new UnauthorizedException("Refresh session is invalid"));

        Instant now = Instant.now();
        if (session.getExpiresAt() == null || session.getExpiresAt().isBefore(now)) {
            // Legacy pre-expiry sessions and expired sessions are revoked.
            refreshSessionRepository.delete(session);
            throw new UnauthorizedException("Refresh session is invalid");
        }

        Users user = session.getUser();
        // Rotate: consume the presented token, keeping a short grace window
        // so pages that share localStorage and refresh concurrently with the
        // same token are not logged out.
        session.setExpiresAt(now.plusSeconds(60));
        refreshSessionRepository.save(session);
        return new AuthResponseDTO(jwtUtil.generateToken(user), createRefreshToken(user));
    }

    @Transactional
    public void logout(String refreshToken) {
        if (refreshToken != null && !refreshToken.isBlank()) {
            refreshSessionRepository.deleteByTokenHash(hash(refreshToken));
        }
    }

    private String createRefreshToken(Users user) {
        byte[] bytes = new byte[48];
        secureRandom.nextBytes(bytes);
        String refreshToken = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);

        // Opportunistic cleanup so expired sessions do not accumulate forever.
        refreshSessionRepository.deleteByExpiresAtBefore(Instant.now().minusSeconds(3600));

        RefreshSession session = new RefreshSession();
        session.setTokenHash(hash(refreshToken));
        session.setUser(user);
        session.setExpiresAt(Instant.now().plus(REFRESH_TOKEN_TTL));
        refreshSessionRepository.save(session);
        return refreshToken;
    }

    private String hash(String value) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (java.security.NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is unavailable", e);
        }
    }
}
