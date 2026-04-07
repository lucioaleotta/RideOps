package com.rideops.identity.adapters.out;

import com.rideops.identity.application.admin.UserAdminAuditLogPort;
import com.rideops.multitenancy.TenantContext;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;

@Component
public class UserAdminAuditLogJpaAdapter implements UserAdminAuditLogPort {

    private final UserAdminAuditLogRepository repository;
    private final TenantContext tenantContext;

    public UserAdminAuditLogJpaAdapter(UserAdminAuditLogRepository repository,
                                       TenantContext tenantContext) {
        this.repository = repository;
        this.tenantContext = tenantContext;
    }

    @Override
    public UserAdminAuditLogEntity save(@NonNull UserAdminAuditLogEntity entity) {
        return repository.save(entity);
    }

    @Override
    public List<UserAdminAuditLogEntity> findLatest(int limit, LocalDate dateFilter, String adminUserIdFilter) {
        Long tenantId = tenantContext.getTenantIdOrNull();
        String normalizedAdmin = adminUserIdFilter == null ? "" : adminUserIdFilter.trim();
        boolean hasAdminFilter = !normalizedAdmin.isEmpty();
        boolean hasDateFilter = dateFilter != null;

        if (tenantId == null) {
            // ADMIN cross-tenant: nessun filtro per tenant
            if (!hasAdminFilter && !hasDateFilter) {
                return repository.findTop10ByOrderByCreatedAtDesc();
            }
            if (hasAdminFilter && !hasDateFilter) {
                return repository.findTop10ByAdminUserIdValueIgnoreCaseOrderByCreatedAtDesc(normalizedAdmin);
            }
            LocalDateTime start = dateFilter.atStartOfDay();
            LocalDateTime end = dateFilter.plusDays(1).atStartOfDay().minusNanos(1);
            if (!hasAdminFilter) {
                return repository.findTop10ByCreatedAtBetweenOrderByCreatedAtDesc(start, end);
            }
            return repository.findTop10ByAdminUserIdValueIgnoreCaseAndCreatedAtBetweenOrderByCreatedAtDesc(
                normalizedAdmin, start, end);
        }

        // Utente con tenant: filtro per tenant
        if (!hasAdminFilter && !hasDateFilter) {
            return repository.findTop10ByTenantIdOrderByCreatedAtDesc(tenantId);
        }

        if (hasAdminFilter && !hasDateFilter) {
            return repository.findTop10ByTenantIdAndAdminUserIdValueIgnoreCaseOrderByCreatedAtDesc(tenantId, normalizedAdmin);
        }

        LocalDateTime start = dateFilter.atStartOfDay();
        LocalDateTime end = dateFilter.plusDays(1).atStartOfDay().minusNanos(1);

        if (!hasAdminFilter) {
            return repository.findTop10ByTenantIdAndCreatedAtBetweenOrderByCreatedAtDesc(tenantId, start, end);
        }

        return repository.findTop10ByTenantIdAndAdminUserIdValueIgnoreCaseAndCreatedAtBetweenOrderByCreatedAtDesc(
            tenantId,
            normalizedAdmin,
            start,
            end
        );
    }
}
