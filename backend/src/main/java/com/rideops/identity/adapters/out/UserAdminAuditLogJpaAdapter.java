package com.rideops.identity.adapters.out;

import com.rideops.identity.application.admin.UserAdminAuditLogPort;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;

@Component
public class UserAdminAuditLogJpaAdapter implements UserAdminAuditLogPort {

    private final UserAdminAuditLogRepository repository;

    public UserAdminAuditLogJpaAdapter(UserAdminAuditLogRepository repository) {
        this.repository = repository;
    }

    @Override
    public UserAdminAuditLogEntity save(@NonNull UserAdminAuditLogEntity entity) {
        return repository.save(entity);
    }

    @Override
    public List<UserAdminAuditLogEntity> findLatest(int limit, LocalDate dateFilter, String adminUserIdFilter) {
        String normalizedAdmin = adminUserIdFilter == null ? "" : adminUserIdFilter.trim();
        boolean hasAdminFilter = !normalizedAdmin.isEmpty();
        boolean hasDateFilter = dateFilter != null;

        if (!hasAdminFilter && !hasDateFilter) {
            return repository.findTop10ByOrderByCreatedAtDesc();
        }

        if (hasAdminFilter && !hasDateFilter) {
            return repository.findTop10ByAdminUserIdValueIgnoreCaseOrderByCreatedAtDesc(normalizedAdmin);
        }

        LocalDate selectedDate = dateFilter;
        if (selectedDate == null) {
            return repository.findTop10ByOrderByCreatedAtDesc();
        }

        LocalDateTime start = selectedDate.atStartOfDay();
        LocalDateTime end = selectedDate.plusDays(1).atStartOfDay().minusNanos(1);

        if (!hasAdminFilter) {
            return repository.findTop10ByCreatedAtBetweenOrderByCreatedAtDesc(start, end);
        }

        return repository.findTop10ByAdminUserIdValueIgnoreCaseAndCreatedAtBetweenOrderByCreatedAtDesc(
            normalizedAdmin,
            start,
            end
        );
    }
}
