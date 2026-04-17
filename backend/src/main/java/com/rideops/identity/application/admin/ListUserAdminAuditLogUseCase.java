package com.rideops.identity.application.admin;

import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ListUserAdminAuditLogUseCase {

    private final UserAdminAuditLogPort userAdminAuditLogPort;

    public ListUserAdminAuditLogUseCase(UserAdminAuditLogPort userAdminAuditLogPort) {
        this.userAdminAuditLogPort = userAdminAuditLogPort;
    }

    public List<UserAdminAuditLogDto> execute(LocalDate dateFilter, String adminUserIdFilter) {
        return userAdminAuditLogPort.findLatest(20, dateFilter, adminUserIdFilter)
            .stream()
            .map(entry -> new UserAdminAuditLogDto(
                entry.getId(),
                entry.getAdminUserIdValue(),
                entry.getTargetUserIdValue(),
                entry.getAction(),
                entry.getChangedFields(),
                entry.getCreatedAt()
            ))
            .toList();
    }
}
