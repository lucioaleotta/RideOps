package com.rideops.fleet.application;

import com.rideops.fleet.adapters.out.VehicleDeadlineEntity;
import com.rideops.fleet.adapters.out.VehicleDeadlineRepository;
import com.rideops.fleet.adapters.out.VehicleEntity;
import com.rideops.fleet.adapters.out.VehicleRepository;
import com.rideops.fleet.adapters.out.VehicleUnavailabilityEntity;
import com.rideops.fleet.adapters.out.VehicleUnavailabilityRepository;
import com.rideops.fleet.domain.DeadlineStatus;
import com.rideops.fleet.domain.DeadlineType;
import com.rideops.fleet.domain.VehicleType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;

@Service
public class FleetService {

    private final VehicleRepository vehicleRepository;
    private final VehicleDeadlineRepository vehicleDeadlineRepository;
    private final VehicleUnavailabilityRepository vehicleUnavailabilityRepository;

    public FleetService(VehicleRepository vehicleRepository,
                        VehicleDeadlineRepository vehicleDeadlineRepository,
                        VehicleUnavailabilityRepository vehicleUnavailabilityRepository) {
        this.vehicleRepository = vehicleRepository;
        this.vehicleDeadlineRepository = vehicleDeadlineRepository;
        this.vehicleUnavailabilityRepository = vehicleUnavailabilityRepository;
    }

    public List<VehicleDto> listVehicles() {
        return vehicleRepository.findAllByOrderByPlateAsc().stream()
            .map(this::toVehicleDto)
            .toList();
    }

    public VehicleDto createVehicle(String plate, Integer seats, VehicleType type, String notes) {
        String normalizedPlate = normalizePlate(plate);
        validateVehicle(normalizedPlate, seats, type);

        if (vehicleRepository.existsByPlateIgnoreCase(normalizedPlate)) {
            throw new FleetValidationException("Plate already exists");
        }

        VehicleEntity entity = new VehicleEntity();
        entity.setPlate(normalizedPlate);
        entity.setSeats(seats);
        entity.setType(type);
        entity.setNotes(cleanNullable(notes));

        return toVehicleDto(vehicleRepository.save(entity));
    }

    public VehicleDto updateVehicle(Long vehicleId, String plate, Integer seats, VehicleType type, String notes) {
        VehicleEntity entity = findVehicle(vehicleId);
        String normalizedPlate = normalizePlate(plate);
        validateVehicle(normalizedPlate, seats, type);

        if (vehicleRepository.existsByPlateIgnoreCaseAndIdNot(normalizedPlate, vehicleId)) {
            throw new FleetValidationException("Plate already exists");
        }

        entity.setPlate(normalizedPlate);
        entity.setSeats(seats);
        entity.setType(type);
        entity.setNotes(cleanNullable(notes));

        return toVehicleDto(vehicleRepository.save(entity));
    }

    public void deleteVehicle(Long vehicleId) {
        VehicleEntity entity = findVehicle(vehicleId);
        vehicleRepository.delete(entity);
    }

    public List<VehicleDeadlineDto> listDeadlines(Long vehicleId) {
        findVehicle(vehicleId);
        return vehicleDeadlineRepository.findAllByVehicleIdOrderByDueDateAsc(vehicleId).stream()
            .map(this::toDeadlineDto)
            .toList();
    }

    public List<VehicleDeadlineDto> listUpcomingDeadlines(int withinDays) {
        int safeDays = Math.max(1, withinDays);
        LocalDate today = LocalDate.now();
        LocalDate deadlineDate = LocalDate.now().plusDays(safeDays);

        return vehicleDeadlineRepository
            .findAllByStatusNotInAndDueDateLessThanEqualOrderByDueDateAsc(closedStatuses(), deadlineDate)
            .stream()
            .filter(item -> !item.getDueDate().isBefore(today))
            .map(this::toDeadlineDto)
            .toList();
    }

    public List<VehicleDeadlineDto> listOverdueDeadlines() {
        LocalDate today = LocalDate.now();

        return vehicleDeadlineRepository
            .findAllByStatusNotInAndDueDateLessThanOrderByDueDateAsc(closedStatuses(), today)
            .stream()
            .map(this::toDeadlineDto)
            .toList();
    }

    public VehicleDeadlineDto createDeadline(Long vehicleId,
                                             DeadlineType type,
                                             String title,
                                             String description,
                                             LocalDate dueDate,
                                             DeadlineStatus status,
                                             BigDecimal cost,
                                             String currency,
                                             String notes,
                                             LocalDate paymentDate,
                                             LocalDate executionDate) {
        VehicleEntity vehicle = findVehicle(vehicleId);
        validateDeadline(type, title, dueDate, status, cost, currency, paymentDate, executionDate);

        VehicleDeadlineEntity entity = new VehicleDeadlineEntity();
        entity.setVehicle(vehicle);
        entity.setType(type);
        entity.setTitle(title.trim());
        entity.setDescription(cleanNullable(description));
        entity.setDueDate(dueDate);
        entity.setStatus(normalizeOpenStatus(status, dueDate));
        entity.setCostAmount(cost);
        entity.setCurrency(currency.trim().toUpperCase(Locale.ROOT));
        entity.setNotes(cleanNullable(notes));
        entity.setPaymentDate(paymentDate);
        entity.setExecutionDate(executionDate);

        return toDeadlineDto(vehicleDeadlineRepository.save(entity));
    }

    public VehicleDeadlineDto updateDeadline(Long deadlineId,
                                             DeadlineType type,
                                             String title,
                                             String description,
                                             LocalDate dueDate,
                                             DeadlineStatus status,
                                             BigDecimal cost,
                                             String currency,
                                             String notes,
                                             LocalDate paymentDate,
                                             LocalDate executionDate) {
        VehicleDeadlineEntity entity = vehicleDeadlineRepository.findById(deadlineId)
            .orElseThrow(() -> new DeadlineNotFoundException(deadlineId));

        validateDeadline(type, title, dueDate, status, cost, currency, paymentDate, executionDate);

        entity.setType(type);
        entity.setTitle(title.trim());
        entity.setDescription(cleanNullable(description));
        entity.setDueDate(dueDate);
        entity.setStatus(normalizeOpenStatus(status, dueDate));
        entity.setCostAmount(cost);
        entity.setCurrency(currency.trim().toUpperCase(Locale.ROOT));
        entity.setNotes(cleanNullable(notes));
        entity.setPaymentDate(paymentDate);
        entity.setExecutionDate(executionDate);

        return toDeadlineDto(vehicleDeadlineRepository.save(entity));
    }

    public void deleteDeadline(Long deadlineId) {
        VehicleDeadlineEntity entity = vehicleDeadlineRepository.findById(deadlineId)
            .orElseThrow(() -> new DeadlineNotFoundException(deadlineId));
        vehicleDeadlineRepository.delete(entity);
    }

    public List<VehicleUnavailabilityDto> listUnavailabilities(Long vehicleId) {
        findVehicle(vehicleId);
        return vehicleUnavailabilityRepository.findAllByVehicleIdOrderByStartDateAsc(vehicleId).stream()
            .map(this::toUnavailabilityDto)
            .toList();
    }

    public VehicleUnavailabilityDto createUnavailability(Long vehicleId,
                                                         LocalDate startDate,
                                                         LocalDate endDate,
                                                         String reason) {
        validateUnavailabilityDates(startDate, endDate);
        validateReason(reason);
        VehicleEntity vehicle = findVehicle(vehicleId);

        if (vehicleUnavailabilityRepository.existsByVehicleIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            vehicleId, endDate, startDate)) {
            throw new FleetValidationException("Overlapping unavailability for this vehicle");
        }

        VehicleUnavailabilityEntity entity = new VehicleUnavailabilityEntity();
        entity.setVehicle(vehicle);
        entity.setStartDate(startDate);
        entity.setEndDate(endDate);
        entity.setReason(reason.trim());

        return toUnavailabilityDto(vehicleUnavailabilityRepository.save(entity));
    }

    public VehicleUnavailabilityDto updateUnavailability(Long unavailabilityId,
                                                         LocalDate startDate,
                                                         LocalDate endDate,
                                                         String reason) {
        VehicleUnavailabilityEntity entity = vehicleUnavailabilityRepository.findById(unavailabilityId)
            .orElseThrow(() -> new UnavailabilityNotFoundException(unavailabilityId));

        validateUnavailabilityDates(startDate, endDate);
        validateReason(reason);

        Long vehicleId = entity.getVehicle().getId();
        if (vehicleUnavailabilityRepository.existsByVehicleIdAndIdNotAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            vehicleId, unavailabilityId, endDate, startDate)) {
            throw new FleetValidationException("Overlapping unavailability for this vehicle");
        }

        entity.setStartDate(startDate);
        entity.setEndDate(endDate);
        entity.setReason(reason.trim());

        return toUnavailabilityDto(vehicleUnavailabilityRepository.save(entity));
    }

    public void deleteUnavailability(Long unavailabilityId) {
        VehicleUnavailabilityEntity entity = vehicleUnavailabilityRepository.findById(unavailabilityId)
            .orElseThrow(() -> new UnavailabilityNotFoundException(unavailabilityId));
        vehicleUnavailabilityRepository.delete(entity);
    }

    private VehicleEntity findVehicle(Long vehicleId) {
        return vehicleRepository.findById(vehicleId)
            .orElseThrow(() -> new VehicleNotFoundException(vehicleId));
    }

    private void validateVehicle(String plate, Integer seats, VehicleType type) {
        if (plate.isBlank()) {
            throw new FleetValidationException("Plate is required");
        }
        if (seats == null || seats < 1) {
            throw new FleetValidationException("Seats must be greater than zero");
        }
        if (type == null) {
            throw new FleetValidationException("Vehicle type is required");
        }
    }

    private void validateDeadline(DeadlineType type,
                                  String title,
                                  LocalDate dueDate,
                                  DeadlineStatus status,
                                  BigDecimal cost,
                                  String currency,
                                  LocalDate paymentDate,
                                  LocalDate executionDate) {
        if (type == null) {
            throw new FleetValidationException("Deadline type is required");
        }
        if (title == null || title.trim().isEmpty()) {
            throw new FleetValidationException("Deadline title is required");
        }
        if (dueDate == null) {
            throw new FleetValidationException("Due date is required");
        }
        if (status == null) {
            throw new FleetValidationException("Deadline status is required");
        }
        if (cost == null || cost.compareTo(BigDecimal.ZERO) < 0) {
            throw new FleetValidationException("Cost must be zero or positive");
        }
        if (currency == null || currency.trim().isEmpty() || currency.trim().length() != 3) {
            throw new FleetValidationException("Currency must be a 3-letter code");
        }

        if (status == DeadlineStatus.PAGATA) {
            boolean payableType = type == DeadlineType.BOLLO || type == DeadlineType.ASSICURAZIONE;
            if (!payableType) {
                throw new FleetValidationException("Only BOLLO and ASSICURAZIONE can be closed as PAGATA");
            }
            if (paymentDate == null) {
                throw new FleetValidationException("Payment date is required when status is PAGATA");
            }
        }

        if (status == DeadlineStatus.ESEGUITA) {
            boolean executableType = type == DeadlineType.REVISIONE
                || type == DeadlineType.TAGLIANDO
                || type == DeadlineType.ALTRO;
            if (!executableType) {
                throw new FleetValidationException("Only REVISIONE, TAGLIANDO and ALTRO can be closed as ESEGUITA");
            }
            if (executionDate == null) {
                throw new FleetValidationException("Execution date is required when status is ESEGUITA");
            }
        }
    }

    private void validateUnavailabilityDates(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) {
            throw new FleetValidationException("Start date and end date are required");
        }
        if (endDate.isBefore(startDate)) {
            throw new FleetValidationException("End date must be on or after start date");
        }
    }

    private void validateReason(String reason) {
        if (reason == null || reason.trim().isEmpty()) {
            throw new FleetValidationException("Reason is required");
        }
    }

    private String normalizePlate(String plate) {
        if (plate == null) {
            return "";
        }
        return plate.trim().toUpperCase(Locale.ROOT);
    }

    private String cleanNullable(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private VehicleDto toVehicleDto(VehicleEntity entity) {
        return new VehicleDto(
            entity.getId(),
            entity.getPlate(),
            entity.getSeats(),
            entity.getType(),
            entity.getNotes(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }

    private VehicleDeadlineDto toDeadlineDto(VehicleDeadlineEntity entity) {
        return new VehicleDeadlineDto(
            entity.getId(),
            entity.getVehicle().getId(),
            entity.getType(),
            entity.getTitle(),
            entity.getDescription(),
            entity.getDueDate(),
            resolveDisplayedStatus(entity),
            entity.getCostAmount(),
            entity.getCurrency(),
            entity.getNotes(),
            entity.getPaymentDate(),
            entity.getExecutionDate(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }

    private List<DeadlineStatus> closedStatuses() {
        return List.of(DeadlineStatus.PAGATA, DeadlineStatus.ESEGUITA, DeadlineStatus.ANNULLATA);
    }

    private DeadlineStatus normalizeOpenStatus(DeadlineStatus status, LocalDate dueDate) {
        if (status == DeadlineStatus.DA_ESEGUIRE
            || status == DeadlineStatus.IN_SCADENZA
            || status == DeadlineStatus.SCADUTA) {
            return computeOpenStatus(dueDate);
        }
        return status;
    }

    private DeadlineStatus resolveDisplayedStatus(VehicleDeadlineEntity entity) {
        DeadlineStatus current = entity.getStatus();
        if (current == DeadlineStatus.PAGATA || current == DeadlineStatus.ESEGUITA || current == DeadlineStatus.ANNULLATA) {
            return current;
        }
        return computeOpenStatus(entity.getDueDate());
    }

    private DeadlineStatus computeOpenStatus(LocalDate dueDate) {
        LocalDate today = LocalDate.now();
        if (dueDate.isBefore(today)) {
            return DeadlineStatus.SCADUTA;
        }
        if (!dueDate.isAfter(today.plusDays(7))) {
            return DeadlineStatus.IN_SCADENZA;
        }
        return DeadlineStatus.DA_ESEGUIRE;
    }

    private VehicleUnavailabilityDto toUnavailabilityDto(VehicleUnavailabilityEntity entity) {
        return new VehicleUnavailabilityDto(
            entity.getId(),
            entity.getVehicle().getId(),
            entity.getStartDate(),
            entity.getEndDate(),
            entity.getReason(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }
}
