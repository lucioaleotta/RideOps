package com.rideops.identity.application.admin;

import com.rideops.identity.adapters.out.UserAdminAuditLogEntity;
import com.rideops.identity.domain.UserRole;
import org.springframework.stereotype.Service;

@Service
public class UpdateUserRoleUseCase {

    private final UserAdminRepositoryPort userAdminRepositoryPort;
    private final UserAdminAuditLogPort userAdminAuditLogPort;

    public UpdateUserRoleUseCase(UserAdminRepositoryPort userAdminRepositoryPort,
                                 UserAdminAuditLogPort userAdminAuditLogPort) {
        this.userAdminRepositoryPort = userAdminRepositoryPort;
        this.userAdminAuditLogPort = userAdminAuditLogPort;
    }

    public UserSummaryDto execute(Long userId, UserRole role, String adminUserId, Long adminUserDbId) {
        if (role == null) {
            throw new UserAdminValidationException("Il ruolo e` obbligatorio");
        }

        var user = userAdminRepositoryPort.findById(userId)
            .orElseThrow(() -> new UserAdminNotFoundException("Utente non trovato"));

        user.setRole(role);
        var saved = userAdminRepositoryPort.save(user);

        UserAdminAuditLogEntity audit = new UserAdminAuditLogEntity();
        audit.setTenantId(saved.getTenantId());
        audit.setTargetUserId(saved.getId());
        audit.setTargetUserIdValue(saved.getUserId());
        audit.setAdminUserId(adminUserDbId);
        audit.setAdminUserIdValue((adminUserId == null || adminUserId.isBlank()) ? "unknown" : adminUserId);
        audit.setAction("UPDATE_ROLE");
        audit.setChangedFields("role");
        userAdminAuditLogPort.save(audit);

        return UserAdminMapper.toDto(saved);
    }
}
