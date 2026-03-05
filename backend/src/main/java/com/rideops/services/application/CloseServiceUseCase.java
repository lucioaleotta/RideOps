package com.rideops.services.application;

import com.rideops.services.adapters.out.RideServiceEntity;
import com.rideops.services.domain.RideService;
import com.rideops.services.domain.ServiceDomainException;
import com.rideops.services.domain.ServiceStatus;
import org.springframework.stereotype.Service;

@Service
public class CloseServiceUseCase {

    private final ServiceRepositoryPort serviceRepositoryPort;

    public CloseServiceUseCase(ServiceRepositoryPort serviceRepositoryPort) {
        this.serviceRepositoryPort = serviceRepositoryPort;
    }

    public ServiceDto execute(Long serviceId) {
        RideServiceEntity entity = serviceRepositoryPort.findById(serviceId)
            .orElseThrow(() -> new ServiceNotFoundException(serviceId));

        if (entity.getStatus() != ServiceStatus.ASSIGNED) {
            throw new ServiceValidationException("Service can be closed only when ASSIGNED");
        }

        RideService service = new RideService(entity.getStatus());
        try {
            service.close();
        } catch (ServiceDomainException exception) {
            throw new ServiceValidationException("Invalid status transition");
        }

        entity.setStatus(service.getStatus());
        return ServiceMapper.toDto(serviceRepositoryPort.save(entity));
    }
}