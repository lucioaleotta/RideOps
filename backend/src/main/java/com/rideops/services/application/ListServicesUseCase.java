package com.rideops.services.application;

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
}