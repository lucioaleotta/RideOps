package com.rideops.identity.application.admin;

import java.util.regex.Pattern;
import java.util.Objects;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class SetTemporaryPasswordUseCase {

    private static final Pattern PASSWORD_PATTERN =
        Pattern.compile("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z\\d]).{8,}$");

    private final UserAdminRepositoryPort userAdminRepositoryPort;
    private final PasswordEncoder passwordEncoder;

    public SetTemporaryPasswordUseCase(UserAdminRepositoryPort userAdminRepositoryPort,
                                       PasswordEncoder passwordEncoder) {
        this.userAdminRepositoryPort = userAdminRepositoryPort;
        this.passwordEncoder = passwordEncoder;
    }

    public UserSummaryDto execute(Long userId, String rawTemporaryPassword) {
        Long targetUserId = Objects.requireNonNull(userId, "userId is required");
        validatePassword(rawTemporaryPassword);

        var user = userAdminRepositoryPort.findById(targetUserId)
            .orElseThrow(() -> new UserAdminNotFoundException("Utente non trovato"));

        user.setPasswordHash(passwordEncoder.encode(rawTemporaryPassword));
        return UserAdminMapper.toDto(userAdminRepositoryPort.save(user));
    }

    private void validatePassword(String rawPassword) {
        if (rawPassword == null || !PASSWORD_PATTERN.matcher(rawPassword).matches()) {
            throw new UserAdminValidationException(
                "La password deve avere almeno 8 caratteri con maiuscola, minuscola, numero e carattere speciale"
            );
        }
    }
}