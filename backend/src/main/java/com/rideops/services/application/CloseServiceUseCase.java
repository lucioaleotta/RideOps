package com.rideops.services.application;

import com.rideops.services.adapters.out.RideServiceEntity;
import com.rideops.services.domain.RideService;
import com.rideops.services.domain.ServiceDomainException;
import com.rideops.services.domain.ServiceStatus;
import java.time.LocalDate;
import org.springframework.lang.NonNull;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

@Service
public class CloseServiceUseCase {

    private final ServiceRepositoryPort serviceRepositoryPort;
    private final ApplicationEventPublisher eventPublisher;

    public CloseServiceUseCase(ServiceRepositoryPort serviceRepositoryPort,
                               ApplicationEventPublisher eventPublisher) {
        this.serviceRepositoryPort = serviceRepositoryPort;
        this.eventPublisher = eventPublisher;
    }

    public ServiceDto execute(@NonNull Long serviceId) {
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
        RideServiceEntity saved = serviceRepositoryPort.save(entity);

        eventPublisher.publishEvent(new ServiceClosedEvent(
            saved.getId(),
            saved.getAssignedVehicleId(),
            saved.getAssignedDriverId(),
            saved.getType(),
            saved.getPrice(),
            "EUR",
            LocalDate.now(),
            "Incasso servizio #" + saved.getId()
        ));

        return ServiceMapper.toDto(saved);
    }
}