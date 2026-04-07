package com.rideops.multitenancy.application;

import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ListTenantsUseCase {

    private final TenantManagementRepositoryPort tenantManagementRepositoryPort;

    public ListTenantsUseCase(TenantManagementRepositoryPort tenantManagementRepositoryPort) {
        this.tenantManagementRepositoryPort = tenantManagementRepositoryPort;
    }

    public List<TenantDto> execute(String query) {
        return tenantManagementRepositoryPort.search(query)
            .stream()
            .map(TenantMapper::toDto)
            .toList();
    }
}
