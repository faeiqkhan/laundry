package com.faeiq.ClothNCare.common.config;

import com.faeiq.ClothNCare.user.entity.Role;
import com.faeiq.ClothNCare.user.entity.Users;
import com.faeiq.ClothNCare.user.repository.UsersRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class AdminBootstrap implements CommandLineRunner {

    private final UsersRepository usersRepository;

    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder(12);

    // First-run admin credentials can be overridden without a code change.
    @Value("${app.admin.email:Khnaf@gmail.com}")
    private String adminEmail;

    @Value("${app.admin.password:Admin@12345}")
    private String adminPassword;

    @Override
    public void run(String... args) {
        boolean hasAdmin = usersRepository.findAll().stream()
                .anyMatch(user -> user.getRole() == Role.ADMIN);

        if (hasAdmin) {
            return;
        }

        Users admin = new Users();
        admin.setName("Store Admin");
        admin.setEmail(adminEmail);
        admin.setPassword(encoder.encode(adminPassword));
        admin.setRole(Role.ADMIN);

        usersRepository.save(admin);
        log.info("Admin account created ({}). Change the password after first login.", adminEmail);
        if ("Admin@12345".equals(adminPassword)) {
            log.warn("Running with the built-in default admin password. Set APP_ADMIN_PASSWORD "
                    + "(env var) to override, and change the password inside the app after first login.");
        }
    }
}
