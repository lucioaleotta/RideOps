package com.rideops.identity.application.admin;

import com.rideops.identity.adapters.out.UserEntity;
import java.util.Locale;
import java.util.regex.Pattern;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class UpdateUserUseCase {

    private static final Pattern EMAIL_PATTERN =
        Pattern.compile("^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$", Pattern.CASE_INSENSITIVE);

    private static final Pattern USER_ID_PATTERN =
        Pattern.compile("^[A-Za-z0-9._-]{3,80}$");

    private static final Pattern PASSWORD_PATTERN =
        Pattern.compile("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z\\d]).{8,}$");

    private final UserAdminRepositoryPort userAdminRepositoryPort;
    private final PasswordEncoder passwordEncoder;

    public UpdateUserUseCase(UserAdminRepositoryPort userAdminRepositoryPort,
                             PasswordEncoder passwordEncoder) {
        this.userAdminRepositoryPort = userAdminRepositoryPort;
        this.passwordEncoder = passwordEncoder;
    }

    public UserSummaryDto execute(Long id, UpdateUserCommand command) {
        if (id == null) {
            throw new UserAdminValidationException("Id utente mancante");
        }
        if (command == null) {
            throw new UserAdminValidationException("Payload update mancante");
        }

        UserEntity user = userAdminRepositoryPort.findById(id)
            .orElseThrow(() -> new UserAdminNotFoundException("Utente non trovato"));

        String normalizedEmail = normalizeEmail(command.email());
        String normalizedUserId = normalizeUserId(command.userId());

        validateEmail(normalizedEmail);
        validateUserId(normalizedUserId);

        userAdminRepositoryPort.findByEmailIgnoreCase(normalizedEmail)
            .filter(found -> !found.getId().equals(id))
            .ifPresent(found -> {
                throw new UserAdminValidationException("Email gia in uso");
            });

        userAdminRepositoryPort.findByUserIdIgnoreCase(normalizedUserId)
            .filter(found -> !found.getId().equals(id))
            .ifPresent(found -> {
                throw new UserAdminValidationException("User ID gia in uso");
            });

        if (command.role() == null) {
            throw new UserAdminValidationException("Ruolo obbligatorio");
        }
        if (command.enabled() == null) {
            throw new UserAdminValidationException("Stato abilitazione obbligatorio");
        }

        user.setUserId(normalizedUserId);
        user.setEmail(normalizedEmail);
        user.setRole(command.role());
        user.setEnabled(command.enabled());

        String password = command.newPassword() == null ? "" : command.newPassword().trim();
        if (!password.isEmpty()) {
            validatePassword(password);
            user.setPasswordHash(passwordEncoder.encode(password));
        }

        return UserAdminMapper.toDto(userAdminRepositoryPort.save(user));
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeUserId(String userId) {
        return userId == null ? "" : userId.trim();
    }

    private void validateEmail(String email) {
        if (!EMAIL_PATTERN.matcher(email).matches()) {
            throw new UserAdminValidationException("Formato email non valido");
        }
    }

    private void validateUserId(String userId) {
        if (!USER_ID_PATTERN.matcher(userId).matches()) {
            throw new UserAdminValidationException("User ID non valido (3-80, lettere/numeri/._-)");
        }
    }

    private void validatePassword(String password) {
        if (!PASSWORD_PATTERN.matcher(password).matches()) {
            throw new UserAdminValidationException(
                "La password deve avere almeno 8 caratteri con maiuscola, minuscola, numero e carattere speciale"
            );
        }
    }
}