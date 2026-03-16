package com.rideops.identity.application.admin;

import com.rideops.identity.domain.UserRole;

public record UpdateUserCommand(
    String userId,
    String email,
    UserRole role,
    Boolean enabled,
    String newPassword
) {
}