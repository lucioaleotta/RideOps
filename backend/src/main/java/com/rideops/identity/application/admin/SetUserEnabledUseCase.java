package com.rideops.identity.application.admin;

import org.springframework.stereotype.Service;

@Service
public class SetUserEnabledUseCase {

    private final UserAdminRepositoryPort userAdminRepositoryPort;

    public SetUserEnabledUseCase(UserAdminRepositoryPort userAdminRepositoryPort) {
        this.userAdminRepositoryPort = userAdminRepositoryPort;
    }

    public UserSummaryDto execute(Long userId, boolean enabled) {
        var user = userAdminRepositoryPort.findById(userId)
            .orElseThrow(() -> new UserAdminNotFoundException("User not found"));

        user.setEnabled(enabled);
        return UserAdminMapper.toDto(userAdminRepositoryPort.save(user));
    }
}
