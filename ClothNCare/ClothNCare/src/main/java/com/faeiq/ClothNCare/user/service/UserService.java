package com.faeiq.ClothNCare.user.service;

import com.faeiq.ClothNCare.common.exception.BadRequestException;
import com.faeiq.ClothNCare.common.exception.ConflictException;
import com.faeiq.ClothNCare.common.exception.ResourceNotFoundException;
import com.faeiq.ClothNCare.user.dto.UserDTO;
import com.faeiq.ClothNCare.user.dto.UserResponseDTO;
import com.faeiq.ClothNCare.user.entity.Role;
import com.faeiq.ClothNCare.user.entity.Users;
import com.faeiq.ClothNCare.user.repository.UsersRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UsersRepository usersRepository;

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);

    @Transactional(readOnly = true)
    public List<UserResponseDTO> getAllUsers() {
        return usersRepository.findAll().stream()
                .sorted(Comparator.comparing(Users::getRole).thenComparing(Users::getName))
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public UserResponseDTO createUser(UserDTO dto) {
        if (dto.getEmail() == null || dto.getEmail().isBlank()) {
            throw new BadRequestException("Email is required");
        }
        if (dto.getPassword() == null || dto.getPassword().length() < 6) {
            throw new BadRequestException("Password must be at least 6 characters");
        }
        if (usersRepository.findByEmail(dto.getEmail().trim()) != null) {
            throw new ConflictException("A user with this email already exists");
        }

        Users user = new Users();
        user.setName(dto.getName());
        user.setEmail(dto.getEmail().trim());
        user.setPassword(encoder.encode(dto.getPassword()));
        user.setRole(dto.getRole() == null ? Role.STAFF : dto.getRole());

        return toResponse(usersRepository.save(user));
    }

    @Transactional
    public UserResponseDTO updateUser(String id, UserDTO dto) {
        Users user = findUser(id);

        if (dto.getName() != null && !dto.getName().isBlank()) {
            user.setName(dto.getName().trim());
        }

        if (dto.getEmail() != null && !dto.getEmail().isBlank()) {
            Users existing = usersRepository.findByEmail(dto.getEmail().trim());
            if (existing != null && !existing.getId().equals(id)) {
                throw new ConflictException("A user with this email already exists");
            }
            user.setEmail(dto.getEmail().trim());
        }

        if (dto.getPassword() != null && !dto.getPassword().isBlank()) {
            if (dto.getPassword().length() < 6) {
                throw new BadRequestException("Password must be at least 6 characters");
            }
            user.setPassword(encoder.encode(dto.getPassword()));
        }

        if (dto.getRole() != null && dto.getRole() != user.getRole()) {
            if (user.getRole() == Role.ADMIN) {
                ensureNotLastAdmin(id);
            }
            user.setRole(dto.getRole());
        }

        return toResponse(usersRepository.save(user));
    }

    @Transactional
    public void deleteUser(String id) {
        Users user = findUser(id);

        if (user.getRole() == Role.ADMIN) {
            ensureNotLastAdmin(id);
        }

        usersRepository.delete(user);
    }

    private void ensureNotLastAdmin(String id) {
        long adminCount = usersRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.ADMIN)
                .count();

        if (adminCount <= 1) {
            throw new BadRequestException("Cannot remove or demote the last administrator account");
        }
    }

    private Users findUser(String id) {
        return usersRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
    }

    private UserResponseDTO toResponse(Users user) {
        return new UserResponseDTO(user.getId(), user.getName(), user.getEmail(), user.getRole());
    }
}
