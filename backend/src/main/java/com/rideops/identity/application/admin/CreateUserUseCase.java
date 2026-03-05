package com.rideops.identity.application.admin;

import com.rideops.identity.adapters.out.UserEntity;
import com.rideops.identity.domain.UserRole;
import java.util.Locale;
import java.util.regex.Pattern;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class CreateUserUseCase {

    private static final Pattern EMAIL_PATTERN =
        Pattern.compile("^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$", Pattern.CASE_INSENSITIVE);

    private static final Pattern PASSWORD_PATTERN =
        Pattern.compile("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z\\d]).{8,}$");

    private final UserAdminRepositoryPort userAdminRepositoryPort;
    private final PasswordEncoder passwordEncoder;

    public CreateUserUseCase(UserAdminRepositoryPort userAdminRepositoryPort,
                             PasswordEncoder passwordEncoder) {
        this.userAdminRepositoryPort = userAdminRepositoryPort;
        this.passwordEncoder = passwordEncoder;
    }

    public UserSummaryDto execute(CreateUserCommand command) {
        String email = normalizeEmail(command.email());
        validateEmail(email);
        validatePassword(command.rawPassword());
        validateRole(command.role());

        if (userAdminRepositoryPort.existsByEmailIgnoreCase(email)) {
            throw new UserAdminValidationException("Email already exists");
        }

        UserEntity userEntity = new UserEntity();
        userEntity.setEmail(email);
        userEntity.setPasswordHash(passwordEncoder.encode(command.rawPassword()));
        userEntity.setRole(command.role());
        userEntity.setEnabled(true);

        return UserAdminMapper.toDto(userAdminRepositoryPort.save(userEntity));
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            return "";
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private void validateEmail(String email) {
        if (!EMAIL_PATTERN.matcher(email).matches()) {
            throw new UserAdminValidationException("Invalid email format");
        }
    }

    private void validatePassword(String rawPassword) {
        if (rawPassword == null || !PASSWORD_PATTERN.matcher(rawPassword).matches()) {
            throw new UserAdminValidationException(
                "Password must be at least 8 chars with upper, lower, digit and special char"
            );
        }
    }

    private void validateRole(UserRole role) {
        if (role == null) {
            throw new UserAdminValidationException("Role is required");
        }
    }
}
