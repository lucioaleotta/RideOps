package com.rideops.identity.application.admin;

import com.rideops.identity.domain.UserRole;
import org.springframework.stereotype.Service;

@Service
public class UpdateUserRoleUseCase {

    private final UserAdminRepositoryPort userAdminRepositoryPort;

    public UpdateUserRoleUseCase(UserAdminRepositoryPort userAdminRepositoryPort) {
        this.userAdminRepositoryPort = userAdminRepositoryPort;
    }

    public UserSummaryDto execute(Long userId, UserRole role) {
        if (role == null) {
            throw new UserAdminValidationException("Role is required");
        }

        var user = userAdminRepositoryPort.findById(userId)
            .orElseThrow(() -> new UserAdminNotFoundException("User not found"));

        user.setRole(role);
        return UserAdminMapper.toDto(userAdminRepositoryPort.save(user));
    }
}
