package com.faeiq.ClothNCare.auth.service;

import com.faeiq.ClothNCare.auth.dto.AuthResponseDTO;
import com.faeiq.ClothNCare.auth.dto.LoginDTO;
import com.faeiq.ClothNCare.auth.dto.RegisterDTO;
import com.faeiq.ClothNCare.auth.security.JwtUtil;
import com.faeiq.ClothNCare.common.exception.ConflictException;
import com.faeiq.ClothNCare.common.exception.ResourceNotFoundException;
import com.faeiq.ClothNCare.common.exception.UnauthorizedException;
import com.faeiq.ClothNCare.user.entity.Users;
import com.faeiq.ClothNCare.user.repository.UsersRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final JwtUtil jwtUtil;
    private final UsersRepository usersRepository;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);

    @Transactional
    public void register(RegisterDTO registerDTO) {
        Users existingUser = usersRepository.findByEmail(registerDTO.getEmail());
        if (existingUser != null) {
            throw new ConflictException("User already exists");
        }

        Users user = new Users();
        user.setEmail(registerDTO.getEmail());
        user.setName(registerDTO.getName());
        user.setRole(registerDTO.getRole());
        user.setPassword(encoder.encode(registerDTO.getPassword()));

        usersRepository.save(user);
    }

    @Transactional(readOnly = true)
    public AuthResponseDTO login(LoginDTO loginDTO) {
        Users user = usersRepository.findByEmail(loginDTO.getEmail());

        if (user == null) {
            throw new ResourceNotFoundException("User not found");
        }

        if (!encoder.matches(loginDTO.getPassword(), user.getPassword())) {
            throw new UnauthorizedException("Invalid credentials");
        }

        return new AuthResponseDTO(jwtUtil.generateToken(user));
    }
}
