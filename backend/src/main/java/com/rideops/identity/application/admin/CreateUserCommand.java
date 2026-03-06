package com.rideops.identity.application.admin;

import com.rideops.identity.domain.UserRole;

public record CreateUserCommand(
    String userId,
    String email,
    String rawPassword,
    UserRole role
) {
}
