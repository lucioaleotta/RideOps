package com.rideops.services.application;

import com.rideops.identity.adapters.out.UserEntity;
import com.rideops.identity.application.admin.UserAdminRepositoryPort;
import com.rideops.identity.domain.UserRole;
import com.rideops.services.adapters.out.RideServiceEntity;
import com.rideops.services.domain.ServiceStatus;
import java.time.LocalDateTime;
import java.util.Objects;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;

@Service
public class AssignServiceUseCase {

    private final ServiceRepositoryPort serviceRepositoryPort;
    private final UserAdminRepositoryPort userAdminRepositoryPort;

    public AssignServiceUseCase(ServiceRepositoryPort serviceRepositoryPort,
                                UserAdminRepositoryPort userAdminRepositoryPort) {
        this.serviceRepositoryPort = serviceRepositoryPort;
        this.userAdminRepositoryPort = userAdminRepositoryPort;
    }

    public ServiceDto execute(@NonNull Long serviceId, Long driverId, Long assignedByUserId) {
        RideServiceEntity service = serviceRepositoryPort.findById(serviceId)
            .orElseThrow(() -> new ServiceNotFoundException(serviceId));

        if (service.getStatus() == ServiceStatus.CLOSED || service.getStatus() == ServiceStatus.EXECUTED) {
            throw new ServiceValidationException("Non e` possibile assegnare un servizio ESEGUITO/CLOSED");
        }

        Long safeDriverId = Objects.requireNonNull(driverId, "driverId obbligatorio");

        UserEntity driver = userAdminRepositoryPort.findById(safeDriverId)
            .orElseThrow(() -> new ServiceValidationException("Driver non trovato"));

        if (driver.getRole() != UserRole.DRIVER || !driver.isEnabled()) {
            throw new ServiceValidationException("L'utente selezionato non e` un DRIVER attivo");
        }

        service.setAssignedDriverId(safeDriverId);
        service.setAssignedByUserId(assignedByUserId);
        service.setAssignedAt(LocalDateTime.now());
        service.setStatus(ServiceStatus.ASSIGNED);

        return ServiceMapper.toDto(serviceRepositoryPort.save(service));
    }
}