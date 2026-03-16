package com.rideops.identity.application.admin;

import com.rideops.identity.adapters.out.UserAdminAuditLogEntity;
import java.time.LocalDate;
import java.util.List;
import org.springframework.lang.NonNull;

public interface UserAdminAuditLogPort {

    UserAdminAuditLogEntity save(@NonNull UserAdminAuditLogEntity entity);

    List<UserAdminAuditLogEntity> findLatest(int limit, LocalDate dateFilter, String adminUserIdFilter);
}
