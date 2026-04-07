package com.rideops.identity.adapters.out;

import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserAdminAuditLogRepository extends JpaRepository<UserAdminAuditLogEntity, Long> {

    List<UserAdminAuditLogEntity> findTop10ByTenantIdOrderByCreatedAtDesc(Long tenantId);

    List<UserAdminAuditLogEntity> findTop10ByTenantIdAndAdminUserIdValueIgnoreCaseOrderByCreatedAtDesc(Long tenantId,
                                                                                                          String adminUserIdValue);

    List<UserAdminAuditLogEntity> findTop10ByTenantIdAndCreatedAtBetweenOrderByCreatedAtDesc(Long tenantId,
                                                                                               LocalDateTime start,
                                                                                               LocalDateTime end);

    List<UserAdminAuditLogEntity> findTop10ByTenantIdAndAdminUserIdValueIgnoreCaseAndCreatedAtBetweenOrderByCreatedAtDesc(
        Long tenantId,
        String adminUserIdValue,
        LocalDateTime start,
        LocalDateTime end
    );

    // Metodi cross-tenant utilizzati dall'utente ADMIN (senza tenant)
    List<UserAdminAuditLogEntity> findTop10ByOrderByCreatedAtDesc();

    List<UserAdminAuditLogEntity> findTop10ByAdminUserIdValueIgnoreCaseOrderByCreatedAtDesc(String adminUserIdValue);

    List<UserAdminAuditLogEntity> findTop10ByCreatedAtBetweenOrderByCreatedAtDesc(LocalDateTime start, LocalDateTime end);

    List<UserAdminAuditLogEntity> findTop10ByAdminUserIdValueIgnoreCaseAndCreatedAtBetweenOrderByCreatedAtDesc(
        String adminUserIdValue,
        LocalDateTime start,
        LocalDateTime end
    );
}
