package com.rideops.services.application;

import org.springframework.stereotype.Service;

@Service
public class GetUnassignedServicesCountUseCase {

    private final ServiceRepositoryPort serviceRepositoryPort;

    public GetUnassignedServicesCountUseCase(ServiceRepositoryPort serviceRepositoryPort) {
        this.serviceRepositoryPort = serviceRepositoryPort;
    }

    public long execute() {
        return serviceRepositoryPort.countUnassignedOpenInternalServices();
    }
}