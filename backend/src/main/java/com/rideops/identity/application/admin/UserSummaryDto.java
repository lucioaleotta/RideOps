package com.rideops.identity.application.admin;

import java.time.LocalDateTime;

public record UserSummaryDto(
    Long id,
    String email,
    String role,
    boolean enabled,
    LocalDateTime createdAt
) {
}
