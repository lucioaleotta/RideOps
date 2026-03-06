package com.rideops.services.application;

import com.rideops.services.adapters.out.RideServiceEntity;
import java.util.Objects;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;

@Service
public class DeleteServiceUseCase {

    private final ServiceRepositoryPort serviceRepositoryPort;

    public DeleteServiceUseCase(ServiceRepositoryPort serviceRepositoryPort) {
        this.serviceRepositoryPort = serviceRepositoryPort;
    }

    public void execute(@NonNull Long serviceId) {
        RideServiceEntity entity = serviceRepositoryPort.findById(serviceId)
            .orElseThrow(() -> new ServiceNotFoundException(serviceId));
        serviceRepositoryPort.delete(Objects.requireNonNull(entity));
    }
}