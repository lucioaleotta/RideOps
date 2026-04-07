package com.rideops.multitenancy.application;

import com.rideops.multitenancy.TenantEntity;
import com.rideops.multitenancy.TenantOperationalStatus;
import org.springframework.stereotype.Service;

@Service
public class UpdateTenantStatusUseCase {

    private final TenantManagementRepositoryPort tenantManagementRepositoryPort;

    public UpdateTenantStatusUseCase(TenantManagementRepositoryPort tenantManagementRepositoryPort) {
        this.tenantManagementRepositoryPort = tenantManagementRepositoryPort;
    }

    public TenantDto execute(Long tenantId, TenantOperationalStatus status) {
        if (tenantId == null) {
            throw new TenantValidationException("Tenant id obbligatorio");
        }
        if (status == null) {
            throw new TenantValidationException("Stato tenant obbligatorio");
        }

        TenantEntity tenant = tenantManagementRepositoryPort.findById(tenantId)
            .orElseThrow(() -> new TenantNotFoundException(tenantId));

        tenant.setStatus(status);
        return TenantMapper.toDto(tenantManagementRepositoryPort.save(tenant));
    }
}
