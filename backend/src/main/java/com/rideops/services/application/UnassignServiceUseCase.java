package com.rideops.services.application;

import com.rideops.services.adapters.out.RideServiceEntity;
import com.rideops.services.domain.ServiceStatus;
import org.springframework.stereotype.Service;

@Service
public class UnassignServiceUseCase {

    private final ServiceRepositoryPort serviceRepositoryPort;

    public UnassignServiceUseCase(ServiceRepositoryPort serviceRepositoryPort) {
        this.serviceRepositoryPort = serviceRepositoryPort;
    }

    public ServiceDto execute(Long serviceId) {
        RideServiceEntity service = serviceRepositoryPort.findById(serviceId)
            .orElseThrow(() -> new ServiceNotFoundException(serviceId));

        if (service.getStatus() == ServiceStatus.CLOSED) {
            throw new ServiceValidationException("Cannot unassign a CLOSED service");
        }

        service.setAssignedDriverId(null);
        service.setAssignedByUserId(null);
        service.setAssignedAt(null);
        service.setStatus(ServiceStatus.OPEN);

        return ServiceMapper.toDto(serviceRepositoryPort.save(service));
    }
}