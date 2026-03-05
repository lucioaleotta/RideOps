package com.rideops.services.application;

import org.springframework.stereotype.Service;

@Service
public class GetServiceUseCase {

    private final ServiceRepositoryPort serviceRepositoryPort;

    public GetServiceUseCase(ServiceRepositoryPort serviceRepositoryPort) {
        this.serviceRepositoryPort = serviceRepositoryPort;
    }

    public ServiceDto execute(Long serviceId) {
        return serviceRepositoryPort.findById(serviceId)
            .map(ServiceMapper::toDto)
            .orElseThrow(() -> new ServiceNotFoundException(serviceId));
    }
}