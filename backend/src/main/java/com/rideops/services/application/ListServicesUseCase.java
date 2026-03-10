package com.rideops.services.application;

import com.rideops.services.domain.ServiceStatus;
import com.rideops.services.domain.ServiceType;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ListServicesUseCase {

    private final ServiceRepositoryPort serviceRepositoryPort;

    public ListServicesUseCase(ServiceRepositoryPort serviceRepositoryPort) {
        this.serviceRepositoryPort = serviceRepositoryPort;
    }

    public List<ServiceDto> execute() {
        return serviceRepositoryPort.findAllByOrderByStartAtDesc()
            .stream()
            .map(ServiceMapper::toDto)
            .toList();
    }

    public List<ServiceDto> execute(LocalDateTime from,
                                    LocalDateTime to,
                                    Long driverId,
                                    ServiceStatus status,
                                    ServiceType type) {
        boolean hasFilters = from != null || to != null || driverId != null || status != null || type != null;

        if (!hasFilters) {
            return execute();
        }

        return serviceRepositoryPort.findByFilters(from, to, driverId, status, type)
            .stream()
            .map(ServiceMapper::toDto)
            .toList();
    }
}