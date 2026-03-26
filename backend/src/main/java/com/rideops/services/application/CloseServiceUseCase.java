package com.rideops.services.application;

import com.rideops.services.adapters.out.RideServiceEntity;
import com.rideops.services.domain.RideService;
import com.rideops.services.domain.ServiceDomainException;
import com.rideops.services.domain.ServiceStatus;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Objects;
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

        validateCloseableStatus(entity);

        return closeEntity(entity);
    }

    public ServiceDto executeByDriver(Long serviceId, Long driverUserId) {
        Long safeServiceId = Objects.requireNonNull(serviceId, "serviceId obbligatorio");
        RideServiceEntity entity = serviceRepositoryPort.findById(safeServiceId)
            .orElseThrow(() -> new ServiceNotFoundException(serviceId));

        Long safeDriverUserId = Objects.requireNonNull(driverUserId, "driverUserId obbligatorio");
        if (!safeDriverUserId.equals(entity.getAssignedDriverId())) {
            throw new ServiceValidationException("Puoi segnare ESEGUITO solo servizi assegnati a te");
        }
        if (entity.getStartAt() == null || entity.getStartAt().isAfter(LocalDateTime.now())) {
            throw new ServiceValidationException("Puoi segnare come ESEGUITO solo servizi con data/ora di inizio gia` raggiunta");
        }

        validateExecutableStatus(entity);

        return executeEntity(entity);
    }

    private void validateCloseableStatus(RideServiceEntity entity) {
        if (entity.getStatus() != ServiceStatus.EXECUTED) {
            throw new ServiceValidationException("Il servizio puo` essere chiuso solo quando e` ESEGUITO");
        }
    }

    private void validateExecutableStatus(RideServiceEntity entity) {
        if (entity.getStatus() != ServiceStatus.ASSIGNED) {
            throw new ServiceValidationException("Il servizio puo` essere segnato ESEGUITO solo quando e` ASSIGNED");
        }
    }

    private ServiceDto executeEntity(RideServiceEntity entity) {
        RideService service = new RideService(entity.getStatus());
        try {
            service.execute();
        } catch (ServiceDomainException exception) {
            throw new ServiceValidationException("Transizione di stato non valida");
        }

        entity.setStatus(service.getStatus());
        return ServiceMapper.toDto(serviceRepositoryPort.save(entity));
    }

    private ServiceDto closeEntity(RideServiceEntity entity) {
        RideService service = new RideService(entity.getStatus());
        try {
            service.close();
        } catch (ServiceDomainException exception) {
            throw new ServiceValidationException("Transizione di stato non valida");
        }

        entity.setStatus(service.getStatus());
        RideServiceEntity saved = serviceRepositoryPort.save(entity);

        eventPublisher.publishEvent(new ServiceClosedEvent(
            saved.getId(),
            saved.getAssignedVehicleId(),
            saved.getAssignedDriverId(),
            saved.getType(),
            saved.getServiceAssignmentType(),
            saved.getPrice(),
            saved.getMargin(),
            "EUR",
            LocalDate.now(),
            "Incasso servizio #" + saved.getId()
        ));

        return ServiceMapper.toDto(saved);
    }
}