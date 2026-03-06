package com.rideops.services.application;

import com.rideops.services.adapters.out.RideServiceEntity;
import com.rideops.services.domain.ServiceStatus;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;

@Service
public class UpdateServiceUseCase {

    private final ServiceRepositoryPort serviceRepositoryPort;

    public UpdateServiceUseCase(ServiceRepositoryPort serviceRepositoryPort) {
        this.serviceRepositoryPort = serviceRepositoryPort;
    }

    public ServiceDto execute(@NonNull Long serviceId, UpdateServiceCommand command) {
        RideServiceEntity entity = serviceRepositoryPort.findById(serviceId)
            .orElseThrow(() -> new ServiceNotFoundException(serviceId));

        if (entity.getStatus() == ServiceStatus.CLOSED) {
            throw new ServiceValidationException("Closed service cannot be updated");
        }

        if (command.startAt() == null) {
            throw new ServiceValidationException("Start date/time is required");
        }

        ServiceValidationSupport.validateBusinessFields(
            command.type(),
            command.durationHours(),
            command.pickupLocation(),
            command.destination()
        );

        ServiceValidationSupport.validateRequestedTransition(entity.getStatus(), command.status());

        entity.setStartAt(command.startAt());
        entity.setPickupLocation(command.pickupLocation().trim());
        entity.setDestination(command.destination().trim());
        entity.setType(command.type());
        entity.setDurationHours(command.durationHours());
        entity.setNotes(cleanNullable(command.notes()));
        entity.setPrice(command.price());
        if (command.status() != null) {
            entity.setStatus(command.status());
        }

        return ServiceMapper.toDto(serviceRepositoryPort.save(entity));
    }

    private String cleanNullable(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}