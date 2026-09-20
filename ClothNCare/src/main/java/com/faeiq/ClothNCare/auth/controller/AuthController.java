package com.faeiq.ClothNCare.auth.controller;

import com.faeiq.ClothNCare.auth.dto.AuthResponseDTO;
import com.faeiq.ClothNCare.auth.dto.HealthStatusDTO;
import com.faeiq.ClothNCare.auth.dto.LoginDTO;
import com.faeiq.ClothNCare.auth.dto.RegisterDTO;
import com.faeiq.ClothNCare.auth.dto.RefreshRequestDTO;
import com.faeiq.ClothNCare.auth.service.AuthService;
import com.faeiq.ClothNCare.common.ApiResponse;
import com.faeiq.ClothNCare.common.ApiResponseUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponseDTO>> login(@RequestBody LoginDTO loginDTO) {
        AuthResponseDTO response = authService.login(loginDTO);
        return ResponseEntity.ok(ApiResponseUtil.success(response, "Login successful"));
    }

    @PostMapping("/refresh")
    public ResponseEntity<ApiResponse<AuthResponseDTO>> refresh(@RequestBody RefreshRequestDTO request) {
        AuthResponseDTO response = authService.refresh(request.getRefreshToken());
        return ResponseEntity.ok(ApiResponseUtil.success(response, "Token refreshed"));
    }

    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(@RequestBody RefreshRequestDTO request) {
        authService.logout(request.getRefreshToken());
        return ResponseEntity.ok(ApiResponseUtil.success(null, "Logged out"));
    }

    @PostMapping("/register")
    public ResponseEntity<ApiResponse<Void>> register(@RequestBody RegisterDTO registerDTO) {
        authService.register(registerDTO);
        return ResponseEntity.ok(ApiResponseUtil.success(null, "Successfully registered"));
    }

    @GetMapping("/status")
    public ResponseEntity<ApiResponse<HealthStatusDTO>> status() {
        return ResponseEntity.ok(ApiResponseUtil.success(new HealthStatusDTO("OK"), "Service is running"));
    }
}
