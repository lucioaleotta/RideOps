package com.rideops.services.application;

import com.rideops.services.domain.ServiceStatus;
import com.rideops.services.domain.ServiceType;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ListDriverServicesUseCase {

    private final ServiceRepositoryPort serviceRepositoryPort;

    public ListDriverServicesUseCase(ServiceRepositoryPort serviceRepositoryPort) {
        this.serviceRepositoryPort = serviceRepositoryPort;
    }

    public List<ServiceDto> execute(Long driverId,
                                    LocalDateTime from,
                                    LocalDateTime to,
                                    ServiceStatus status,
                                    ServiceType type) {
        // Reuse repository-level filtered query to avoid duplicating today/upcoming-specific logic.
        return serviceRepositoryPort.findByFilters(from, to, driverId, status, type)
            .stream()
            .map(ServiceMapper::toDto)
            .toList();
    }
}
