package com.rideops.identity.application.admin;

import com.rideops.multitenancy.TenantRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class ListUsersUseCase {

    private final UserAdminRepositoryPort userAdminRepositoryPort;
    private final TenantRepository tenantRepository;

    public ListUsersUseCase(UserAdminRepositoryPort userAdminRepositoryPort,
                            TenantRepository tenantRepository) {
        this.userAdminRepositoryPort = userAdminRepositoryPort;
        this.tenantRepository = tenantRepository;
    }

    public List<UserSummaryDto> execute() {
        Map<Long, String> tenantNames = tenantRepository.findAll()
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
