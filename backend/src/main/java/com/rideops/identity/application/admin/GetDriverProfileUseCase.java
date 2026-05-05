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
        Long safeUserId = Objects.requireNonNull(userId, "userId obbligatorio");
        var user = userAdminRepositoryPort.findById(safeUserId)
            .orElseThrow(() -> new UserAdminNotFoundException("Driver non trovato"));

        if (!user.getRole().isDriverRole()) {
            throw new UserAdminValidationException("L'utente non e` un driver");
        }

        return UserAdminMapper.toDto(user);
    }
}
