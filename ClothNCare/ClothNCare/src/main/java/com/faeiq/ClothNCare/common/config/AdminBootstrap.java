package com.faeiq.ClothNCare.common.config;

import com.faeiq.ClothNCare.user.entity.Role;
import com.faeiq.ClothNCare.user.entity.Users;
import com.faeiq.ClothNCare.user.repository.UsersRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class AdminBootstrap implements CommandLineRunner {

    private final UsersRepository usersRepository;

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);

    @Override
    public void run(String... args) {
        boolean hasAdmin = usersRepository.findAll().stream()
                .anyMatch(user -> user.getRole() == Role.ADMIN);

        if (hasAdmin) {
            return;
        }

        Users admin = new Users();
        admin.setName("Store Admin");
        admin.setEmail("Khnaf@gmail.com");
        admin.setPassword(encoder.encode("Admin@12345"));
        admin.setRole(Role.ADMIN);

        usersRepository.save(admin);
        log.info("Default admin account created (Khnaf@gmail.com). Change the password after first login if desired.");
    }
}
