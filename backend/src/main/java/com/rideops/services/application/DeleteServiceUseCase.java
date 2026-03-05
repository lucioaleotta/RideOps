package com.rideops.services.application;

import com.rideops.services.adapters.out.RideServiceEntity;
import org.springframework.stereotype.Service;

@Service
public class DeleteServiceUseCase {

    private final ServiceRepositoryPort serviceRepositoryPort;

    public DeleteServiceUseCase(ServiceRepositoryPort serviceRepositoryPort) {
        this.serviceRepositoryPort = serviceRepositoryPort;
    }

    public void execute(Long serviceId) {
        RideServiceEntity entity = serviceRepositoryPort.findById(serviceId)
            .orElseThrow(() -> new ServiceNotFoundException(serviceId));
        serviceRepositoryPort.delete(entity);
    }
}