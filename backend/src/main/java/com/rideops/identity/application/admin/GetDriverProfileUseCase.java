package com.rideops.identity.application.admin;

import com.rideops.identity.domain.UserRole;
import java.util.Objects;
import org.springframework.stereotype.Service;

@Service
public class GetDriverProfileUseCase {

    private final UserAdminRepositoryPort userAdminRepositoryPort;

    public GetDriverProfileUseCase(UserAdminRepositoryPort userAdminRepositoryPort) {
        this.userAdminRepositoryPort = userAdminRepositoryPort;
    }

    public UserSummaryDto execute(Long userId) {
        Long safeUserId = Objects.requireNonNull(userId, "userId is required");
        var user = userAdminRepositoryPort.findById(safeUserId)
            .orElseThrow(() -> new UserAdminNotFoundException("Driver not found"));

        if (user.getRole() != UserRole.DRIVER) {
            throw new UserAdminValidationException("User is not a driver");
        }

        return UserAdminMapper.toDto(user);
    }
}
