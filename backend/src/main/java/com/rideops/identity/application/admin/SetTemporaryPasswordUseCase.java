package com.rideops.identity.application.admin;

import com.rideops.identity.adapters.out.UserAdminAuditLogEntity;
import com.rideops.identity.application.PasswordPolicy;
import java.util.Objects;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class SetTemporaryPasswordUseCase {

    private final UserAdminRepositoryPort userAdminRepositoryPort;
    private final UserAdminAuditLogPort userAdminAuditLogPort;
    private final PasswordEncoder passwordEncoder;
    private final PasswordPolicy passwordPolicy;

    public SetTemporaryPasswordUseCase(UserAdminRepositoryPort userAdminRepositoryPort,
                                       UserAdminAuditLogPort userAdminAuditLogPort,
                                       PasswordEncoder passwordEncoder,
                                       PasswordPolicy passwordPolicy) {
        this.userAdminRepositoryPort = userAdminRepositoryPort;
        this.userAdminAuditLogPort = userAdminAuditLogPort;
        this.passwordEncoder = passwordEncoder;
        this.passwordPolicy = passwordPolicy;
    }

    public UserSummaryDto execute(Long userId, String rawTemporaryPassword, String adminUserId, Long adminUserDbId) {
        Long targetUserId = Objects.requireNonNull(userId, "userId is required");
        validatePassword(rawTemporaryPassword);

        var user = userAdminRepositoryPort.findById(targetUserId)
            .orElseThrow(() -> new UserAdminNotFoundException("Utente non trovato"));

        user.setPasswordHash(passwordEncoder.encode(rawTemporaryPassword));
        var saved = userAdminRepositoryPort.save(user);

        UserAdminAuditLogEntity audit = new UserAdminAuditLogEntity();
        audit.setTenantId(saved.getTenantId());
        audit.setTargetUserId(saved.getId());
        audit.setTargetUserIdValue(saved.getUserId());
        audit.setAdminUserId(adminUserDbId);
        audit.setAdminUserIdValue((adminUserId == null || adminUserId.isBlank()) ? "unknown" : adminUserId);
        audit.setAction("SET_TEMPORARY_PASSWORD");
        audit.setChangedFields("password");
        userAdminAuditLogPort.save(audit);

        return UserAdminMapper.toDto(saved);
    }

    private void validatePassword(String rawPassword) {
        if (!passwordPolicy.isCompliant(rawPassword)) {
            throw new UserAdminValidationException(passwordPolicy.validationMessage());
        }
    }
}