package com.rideops.identity.adapters.out;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserAdminAuditLogRepository extends JpaRepository<UserAdminAuditLogEntity, Long> {

    List<UserAdminAuditLogEntity> findTop20ByTenantIdOrderByCreatedAtDesc(Long tenantId);

    List<UserAdminAuditLogEntity> findTop20ByTenantIdAndAdminUserIdValueIgnoreCaseOrderByCreatedAtDesc(Long tenantId,
                                                                                                          String adminUserIdValue);

    List<UserAdminAuditLogEntity> findTop20ByTenantIdAndCreatedAtBetweenOrderByCreatedAtDesc(Long tenantId,
                                                                                               LocalDateTime start,
                                                                                               LocalDateTime end);

    List<UserAdminAuditLogEntity> findTop20ByTenantIdAndAdminUserIdValueIgnoreCaseAndCreatedAtBetweenOrderByCreatedAtDesc(
        Long tenantId,
        String adminUserIdValue,
        LocalDateTime start,
        LocalDateTime end
    );

    // Metodi cross-tenant utilizzati dall'utente ADMIN (senza tenant)
    List<UserAdminAuditLogEntity> findTop20ByOrderByCreatedAtDesc();

    List<UserAdminAuditLogEntity> findTop20ByAdminUserIdValueIgnoreCaseOrderByCreatedAtDesc(String adminUserIdValue);

    List<UserAdminAuditLogEntity> findTop20ByCreatedAtBetweenOrderByCreatedAtDesc(LocalDateTime start, LocalDateTime end);

    List<UserAdminAuditLogEntity> findTop20ByAdminUserIdValueIgnoreCaseAndCreatedAtBetweenOrderByCreatedAtDesc(
        String adminUserIdValue,
        LocalDateTime start,
        LocalDateTime end
    );
}
