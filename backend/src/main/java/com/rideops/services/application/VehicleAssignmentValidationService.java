package com.rideops.services.application;

import com.rideops.fleet.adapters.out.VehicleRepository;
import com.rideops.fleet.adapters.out.VehicleUnavailabilityRepository;
import com.rideops.services.domain.ServiceStatus;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import org.springframework.stereotype.Service;

@Service
public class VehicleAssignmentValidationService {

    public static final String VEHICLE_DAY_CONFLICT_MESSAGE =
        "Il veicolo risulta già assegnato ad un altro servizio nella stessa giornata";

    public static final String VEHICLE_MAINTENANCE_CONFLICT_MESSAGE =
        "Il veicolo risulta in manutenzione nella giornata del servizio";

    private final ServiceRepositoryPort serviceRepositoryPort;
    private final VehicleRepository vehicleRepository;
    private final VehicleUnavailabilityRepository vehicleUnavailabilityRepository;

    public VehicleAssignmentValidationService(ServiceRepositoryPort serviceRepositoryPort,
                                              VehicleRepository vehicleRepository,
                                              VehicleUnavailabilityRepository vehicleUnavailabilityRepository) {
        this.serviceRepositoryPort = serviceRepositoryPort;
        this.vehicleRepository = vehicleRepository;
        this.vehicleUnavailabilityRepository = vehicleUnavailabilityRepository;
    }

    public void validateForCreate(CreateServiceCommand command) {
        Long vehicleId = command.assignedVehicleId();
        if (vehicleId == null) {
            return;
        }

        LocalDateTime startAt = Objects.requireNonNull(command.startAt(), "startAt is required");
        validateVehicleExists(vehicleId);
        validateVehicleDayConflictForCreate(vehicleId, startAt, Boolean.TRUE.equals(command.overrideVehicleDayConflict()));
        validateVehicleMaintenance(vehicleId, startAt.toLocalDate(), Boolean.TRUE.equals(command.overrideVehicleMaintenanceConflict()));
    }

    public void validateForUpdate(Long serviceId, UpdateServiceCommand command) {
        Long vehicleId = command.assignedVehicleId();
        if (vehicleId == null) {
            return;
        }

        LocalDateTime startAt = Objects.requireNonNull(command.startAt(), "startAt is required");
        validateVehicleExists(vehicleId);
        validateVehicleDayConflictForUpdate(serviceId, vehicleId, startAt, Boolean.TRUE.equals(command.overrideVehicleDayConflict()));
        validateVehicleMaintenance(vehicleId, startAt.toLocalDate(), Boolean.TRUE.equals(command.overrideVehicleMaintenanceConflict()));
    }

    private void validateVehicleExists(Long vehicleId) {
        Long safeVehicleId = Objects.requireNonNull(vehicleId, "vehicleId is required");
        if (!vehicleRepository.existsById(safeVehicleId)) {
            throw new ServiceValidationException("Vehicle not found");
        }
    }

    private void validateVehicleDayConflictForCreate(Long vehicleId, LocalDateTime startAt, boolean override) {
        LocalDateTime from = startAt.toLocalDate().atStartOfDay();
        LocalDateTime to = from.plusDays(1);

        long conflicts = serviceRepositoryPort.countByAssignedVehicleIdAndStartAtGreaterThanEqualAndStartAtLessThanAndStatusIn(
            vehicleId,
            from,
            to,
            List.of(ServiceStatus.OPEN, ServiceStatus.ASSIGNED)
        );

        if (conflicts > 0 && !override) {
            throw new ServiceValidationException(VEHICLE_DAY_CONFLICT_MESSAGE);
        }
    }

    private void validateVehicleDayConflictForUpdate(Long serviceId,
                                                     Long vehicleId,
                                                     LocalDateTime startAt,
                                                     boolean override) {
        LocalDateTime from = startAt.toLocalDate().atStartOfDay();
        LocalDateTime to = from.plusDays(1);

        long conflicts = serviceRepositoryPort
            .countByAssignedVehicleIdAndStartAtGreaterThanEqualAndStartAtLessThanAndStatusInAndIdNot(
                vehicleId,
                from,
                to,
                List.of(ServiceStatus.OPEN, ServiceStatus.ASSIGNED),
                serviceId
            );

        if (conflicts > 0 && !override) {
            throw new ServiceValidationException(VEHICLE_DAY_CONFLICT_MESSAGE);
        }
    }

    private void validateVehicleMaintenance(Long vehicleId, LocalDate serviceDate, boolean override) {
        boolean inMaintenance = vehicleUnavailabilityRepository
            .existsByVehicleIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(vehicleId, serviceDate, serviceDate);

        if (inMaintenance && !override) {
            throw new ServiceValidationException(VEHICLE_MAINTENANCE_CONFLICT_MESSAGE);
        }
    }
}
