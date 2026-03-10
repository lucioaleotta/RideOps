package com.rideops.identity.application.admin;

import com.rideops.identity.domain.UserRole;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ListDriversUseCase {

    private final UserAdminRepositoryPort userAdminRepositoryPort;

    public ListDriversUseCase(UserAdminRepositoryPort userAdminRepositoryPort) {
        this.userAdminRepositoryPort = userAdminRepositoryPort;
    }

    public List<UserSummaryDto> execute(boolean includeDeleted) {
        return userAdminRepositoryPort.findAllByRoleOrderByCreatedAtDesc(UserRole.DRIVER)
            .stream()
            .filter(user -> includeDeleted || user.isEnabled())
            .sorted(Comparator
                .comparing((com.rideops.identity.adapters.out.UserEntity user) -> user.isEnabled() ? 0 : 1)
                .thenComparing(user -> safe(user.getLastName()))
                .thenComparing(user -> safe(user.getFirstName()))
                .thenComparing(user -> safe(user.getUserId())))
            .map(UserAdminMapper::toDto)
            .toList();
    }

    private String safe(String value) {
        return value == null ? "" : value.toLowerCase();
    }
}
