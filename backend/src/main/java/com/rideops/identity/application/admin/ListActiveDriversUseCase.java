package com.rideops.identity.application.admin;

import com.rideops.identity.domain.UserRole;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ListActiveDriversUseCase {

    private final UserAdminRepositoryPort userAdminRepositoryPort;

    public ListActiveDriversUseCase(UserAdminRepositoryPort userAdminRepositoryPort) {
        this.userAdminRepositoryPort = userAdminRepositoryPort;
    }

    public List<UserSummaryDto> execute() {
        return userAdminRepositoryPort.findAllByRoleAndEnabledTrueOrderByEmailAsc(UserRole.DRIVER)
            .stream()
            .map(UserAdminMapper::toDto)
            .toList();
    }
}