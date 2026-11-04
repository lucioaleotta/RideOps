package com.rideops.services.application;

import com.rideops.services.adapters.out.RideServiceEntity;
import com.rideops.services.domain.RideService;
import com.rideops.services.domain.ServiceDomainException;
import com.rideops.services.domain.ServiceStatus;
import com.rideops.services.domain.ServiceAssignmentType;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Objects;
import org.springframework.lang.NonNull;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    @Transactional
    public ServiceDto executeManualOutsourcedClose(Long serviceId, Boolean partnerExecutionConfirmed, Long gestorUserId) {
        Long safeServiceId = Objects.requireNonNull(serviceId, "serviceId obbligatorio");
        Long safeGestorUserId = Objects.requireNonNull(gestorUserId, "userId obbligatorio");
        if (!Boolean.TRUE.equals(partnerExecutionConfirmed)) {
            throw new ServiceValidationException("Conferma obbligatoria dell'esecuzione da parte del partner");
        }

        RideServiceEntity entity = serviceRepositoryPort.findByIdForUpdate(safeServiceId)
            .orElseThrow(() -> new ServiceNotFoundException(safeServiceId));

        if (entity.getStatus() == ServiceStatus.CLOSED && "MANUAL_PARTNER_CONFIRMED".equals(entity.getCloseMode())) {
            return ServiceMapper.toDto(entity);
        }
        if (entity.getStatus() != ServiceStatus.OPEN) {
            throw new ServiceValidationException("La chiusura manuale è consentita solo per servizi OPEN");
        }
        ServiceAssignmentType assignmentType = entity.getServiceAssignmentType();
        if (assignmentType != ServiceAssignmentType.OUTSOURCED
            && assignmentType != ServiceAssignmentType.INCOMING_OUTSOURCED) {
            throw new ServiceValidationException("La chiusura manuale è consentita solo per servizi affidati a un partner esecutore");
        }
        if (entity.getStartAt() == null || entity.getStartAt().isAfter(LocalDateTime.now())) {
            throw new ServiceValidationException("Non è possibile chiudere il servizio prima della data/ora prevista");
        }

        Long executorPartnerId = assignmentType == ServiceAssignmentType.INCOMING_OUTSOURCED
            ? entity.getOutgoingPartnerId()
            : entity.getPartnerId();
        if (executorPartnerId == null) {
            throw new ServiceValidationException("Partner esecutore non valorizzato per il servizio affidato");
        }

        RideService service = new RideService(entity.getStatus());
        try {
            service.closeManuallyAfterPartnerConfirmation();
        } catch (ServiceDomainException exception) {
            throw new ServiceValidationException("Transizione di stato non valida");
        }

        LocalDateTime closedAt = LocalDateTime.now();
        entity.setStatus(service.getStatus());
        entity.setClosedByUserId(safeGestorUserId);
        entity.setClosedAt(closedAt);
        entity.setCloseMode("MANUAL_PARTNER_CONFIRMED");
        RideServiceEntity saved = serviceRepositoryPort.save(entity);

        eventPublisher.publishEvent(new ServiceClosedEvent(
            saved.getTenantId(),
            saved.getId(),
            saved.getAssignedVehicleId(),
            saved.getAssignedDriverId(),
            saved.getType(),
            assignmentType,
            saved.getPrice(),
            saved.getMargin(),
            "EUR",
            closedAt.toLocalDate(),
            "Chiusura manuale servizio affidato #" + saved.getId()
        ));
        return ServiceMapper.toDto(saved);
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
            saved.getTenantId(),
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