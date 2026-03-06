package com.rideops.identity.application;

import com.rideops.identity.adapters.out.UserEntity;
import com.rideops.identity.adapters.out.UserRepository;
import com.rideops.identity.domain.UserRole;
import java.util.Locale;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class AdminSeedConfig {

    @Bean
    CommandLineRunner seedAdmin(UserRepository userRepository,
                                PasswordEncoder passwordEncoder,
                                @Value("${rideops.security.admin.user-id}") String adminUserId,
                                @Value("${rideops.security.admin.email}") String adminEmail,
                                @Value("${rideops.security.admin.password}") String adminPassword) {
        return args -> userRepository.findByEmailIgnoreCase(adminEmail).orElseGet(() -> {
            UserEntity user = new UserEntity();
            user.setUserId(adminUserId.trim().toLowerCase(Locale.ROOT));
            user.setEmail(adminEmail);
            user.setPasswordHash(passwordEncoder.encode(adminPassword));
            user.setRole(UserRole.ADMIN);
            user.setEnabled(true);
            return userRepository.save(user);
        });
    }
}
