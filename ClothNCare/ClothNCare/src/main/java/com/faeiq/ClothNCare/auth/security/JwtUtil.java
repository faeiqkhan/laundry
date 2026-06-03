package com.faeiq.ClothNCare.auth.security;

import com.faeiq.ClothNCare.user.entity.Users;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.security.Key;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Slf4j
@Component
public class JwtUtil {

    private Key key;

    private static final long EXPIRATION = 1000 * 60 * 60 * 24; // 24 hours

    @Value("${spring.config.JWT_SECRET_KEY:${JWT_SECRET_KEY:}}")
    private String jwtSecretKey;

    @PostConstruct
    public void init() {
        if (jwtSecretKey == null || jwtSecretKey.length() < 32) {
            throw new IllegalStateException("JWT secret must be configured and at least 32 characters long");
        }

        this.key = Keys.hmacShaKeyFor(jwtSecretKey.getBytes(StandardCharsets.UTF_8));
    }

    // ===================== TOKEN GENERATION =====================

    public String generateToken(Users user) {
        log.info("Generating token for user: {}", user.getEmail());

        return Jwts.builder()
                .setSubject(user.getEmail())
                .claim("id", user.getId())
                .claim("role", user.getRole().name()) // ADMIN / STAFF
                .claim("name", user.getName())
                .setIssuedAt(new Date())
                .setExpiration(new Date(System.currentTimeMillis() + EXPIRATION))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    // ===================== EXTRACTION =====================

    public String extractEmail(String token) {
        return extractAllClaims(token).getSubject();
    }

    public String extractRole(String token) {
        return extractAllClaims(token).get("role", String.class);
    }

    // ===================== VALIDATION =====================

    public boolean validateToken(String token, String email) {
        try {
            Claims claims = extractAllClaims(token);

            return claims.getSubject().equals(email)
                    && !isExpired(claims);

        } catch (JwtException e) {
            log.error("Invalid token: {}", e.getMessage());
            return false;
        }
    }

    private boolean isExpired(Claims claims) {
        return claims.getExpiration().before(new Date());
    }

    // ===================== CORE =====================

    public Claims extractAllClaims(String token) {
        return Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
    }
}
