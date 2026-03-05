package com.rideops.identity.application.admin;

import com.rideops.identity.domain.UserRole;

public record CreateUserCommand(
    String email,
    String rawPassword,
    UserRole role
) {
}
