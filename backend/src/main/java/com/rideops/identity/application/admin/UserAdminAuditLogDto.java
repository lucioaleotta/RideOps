package com.rideops.identity.application.admin;

import java.time.LocalDateTime;

public record UserAdminAuditLogDto(
    Long id,
    String adminUserId,
    String targetUserId,
    String action,
    String changedFields,
    LocalDateTime createdAt
) {
}
