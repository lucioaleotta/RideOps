package com.rideops.services.application;

import com.rideops.identity.adapters.out.UserEntity;
import com.rideops.identity.application.admin.UserAdminRepositoryPort;
import com.rideops.identity.domain.UserRole;
import com.rideops.services.adapters.out.RideServiceEntity;
import com.rideops.services.domain.ServiceStatus;
import java.time.LocalDateTime;
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

    public ServiceDto execute(Long serviceId, Long driverId, Long assignedByUserId) {
        RideServiceEntity service = serviceRepositoryPort.findById(serviceId)
            .orElseThrow(() -> new ServiceNotFoundException(serviceId));

        if (service.getStatus() == ServiceStatus.CLOSED) {
            throw new ServiceValidationException("Cannot assign a CLOSED service");
        }

        UserEntity driver = userAdminRepositoryPort.findById(driverId)
            .orElseThrow(() -> new ServiceValidationException("Driver not found"));

        if (driver.getRole() != UserRole.DRIVER || !driver.isEnabled()) {
            throw new ServiceValidationException("Target user is not an active DRIVER");
        }

        service.setAssignedDriverId(driverId);
        service.setAssignedByUserId(assignedByUserId);
        service.setAssignedAt(LocalDateTime.now());
        service.setStatus(ServiceStatus.ASSIGNED);

        return ServiceMapper.toDto(serviceRepositoryPort.save(service));
    }
}