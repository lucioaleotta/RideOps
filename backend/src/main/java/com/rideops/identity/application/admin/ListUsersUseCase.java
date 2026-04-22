package com.rideops.identity.application.admin;

import com.rideops.multitenancy.application.TenantManagementRepositoryPort;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ListUsersUseCase {

    private final UserAdminRepositoryPort userAdminRepositoryPort;
    private final TenantManagementRepositoryPort tenantManagementRepositoryPort;

    public ListUsersUseCase(UserAdminRepositoryPort userAdminRepositoryPort,
                            TenantManagementRepositoryPort tenantManagementRepositoryPort) {
        this.userAdminRepositoryPort = userAdminRepositoryPort;
        this.tenantManagementRepositoryPort = tenantManagementRepositoryPort;
    }

    public List<UserSummaryDto> execute() {
        Map<Long, String> tenantNames = tenantManagementRepositoryPort.findAllByOrderByBusinessNameAsc()
            .stream()
            .collect(Collectors.toMap(t -> t.getId(), t -> t.getBusinessName()));

        return userAdminRepositoryPort.findAllByOrderByCreatedAtDesc()
            .stream()
            .map(user -> UserAdminMapper.toDto(
                user,
                user.getTenantId() != null ? tenantNames.get(user.getTenantId()) : null
            ))
            .toList();
    }
}
