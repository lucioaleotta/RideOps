package com.rideops.identity.application.admin;

import com.rideops.identity.adapters.out.UserAdminAuditLogEntity;
import org.springframework.stereotype.Service;

@Service
public class SetUserEnabledUseCase {

    private final UserAdminRepositoryPort userAdminRepositoryPort;
    private final UserAdminAuditLogPort userAdminAuditLogPort;

    public SetUserEnabledUseCase(UserAdminRepositoryPort userAdminRepositoryPort,
                                 UserAdminAuditLogPort userAdminAuditLogPort) {
        this.userAdminRepositoryPort = userAdminRepositoryPort;
        this.userAdminAuditLogPort = userAdminAuditLogPort;
    }

    public UserSummaryDto execute(Long userId, boolean enabled, String adminUserId, Long adminUserDbId) {
        var user = userAdminRepositoryPort.findById(userId)
            .orElseThrow(() -> new UserAdminNotFoundException("Utente non trovato"));

        user.setEnabled(enabled);
        var saved = userAdminRepositoryPort.save(user);

        UserAdminAuditLogEntity audit = new UserAdminAuditLogEntity();
        audit.setTenantId(saved.getTenantId());
        audit.setTargetUserId(saved.getId());
        audit.setTargetUserIdValue(saved.getUserId());
        audit.setAdminUserId(adminUserDbId);
        audit.setAdminUserIdValue((adminUserId == null || adminUserId.isBlank()) ? "unknown" : adminUserId);
        audit.setAction(enabled ? "ENABLE_USER" : "DISABLE_USER");
        audit.setChangedFields("enabled");
        userAdminAuditLogPort.save(audit);

        return UserAdminMapper.toDto(saved);
    }
}
