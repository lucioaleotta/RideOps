package com.rideops.services.application;

import com.rideops.services.adapters.out.RideServiceEntity;
import com.rideops.services.domain.ServiceStatus;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;

@Service
public class CreateServiceUseCase {

    private final ServiceRepositoryPort serviceRepositoryPort;
    private final VehicleAssignmentValidationService vehicleAssignmentValidationService;

    public CreateServiceUseCase(ServiceRepositoryPort serviceRepositoryPort,
                                VehicleAssignmentValidationService vehicleAssignmentValidationService) {
        this.serviceRepositoryPort = serviceRepositoryPort;
        this.vehicleAssignmentValidationService = vehicleAssignmentValidationService;
    }

    public ServiceDto execute(CreateServiceCommand command) {
        validateStartAt(command.startAt());
        ServiceValidationSupport.validateBusinessFields(
            command.type(),
            command.durationHours(),
            command.pickupLocation(),
            command.destination()
        );
        vehicleAssignmentValidationService.validateForCreate(command);

        ServiceStatus initialStatus = ServiceValidationSupport.sanitizeCreateStatus(command.status());

        RideServiceEntity entity = new RideServiceEntity();
        entity.setStartAt(command.startAt());
        entity.setPickupLocation(command.pickupLocation().trim());
        entity.setDestination(command.destination().trim());
        entity.setType(command.type());
        entity.setDurationHours(command.durationHours());
        entity.setNotes(cleanNullable(command.notes()));
        entity.setPrice(command.price());
        entity.setStatus(initialStatus);
        entity.setAssignedVehicleId(command.assignedVehicleId());

        return ServiceMapper.toDto(serviceRepositoryPort.save(entity));
    }

    private void validateStartAt(LocalDateTime startAt) {
        if (startAt == null) {
            throw new ServiceValidationException("Start date/time is required");
        }
    }

    private String cleanNullable(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}