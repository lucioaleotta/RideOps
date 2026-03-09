package com.rideops.services.application;

import com.rideops.services.domain.ServiceStatus;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Service;

@Service
public class CountActiveAssignedServicesByDriverUseCase {

    private final ServiceRepositoryPort serviceRepositoryPort;

    public CountActiveAssignedServicesByDriverUseCase(ServiceRepositoryPort serviceRepositoryPort) {
        this.serviceRepositoryPort = serviceRepositoryPort;
    }

    public long execute(Long driverId) {
        Long safeDriverId = Objects.requireNonNull(driverId, "driverId is required");
        return serviceRepositoryPort.countByAssignedDriverIdAndStatusIn(
            safeDriverId,
            List.of(ServiceStatus.OPEN, ServiceStatus.ASSIGNED)
        );
    }
}
