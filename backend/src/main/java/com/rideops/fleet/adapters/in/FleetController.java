package com.rideops.fleet.adapters.in;

import com.rideops.fleet.application.DeadlineNotFoundException;
import com.rideops.fleet.application.FleetService;
import com.rideops.fleet.application.FleetValidationException;
import com.rideops.fleet.application.UnavailabilityNotFoundException;
import com.rideops.fleet.application.VehicleDeadlineDto;
import com.rideops.fleet.application.VehicleDto;
import com.rideops.fleet.application.VehicleNotFoundException;
import com.rideops.fleet.application.VehicleUnavailabilityDto;
import com.rideops.fleet.domain.DeadlineStatus;
import com.rideops.fleet.domain.DeadlineType;
import com.rideops.fleet.domain.VehicleType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/fleet")
@PreAuthorize("hasAnyRole('ADMIN','GESTIONALE')")
public class FleetController {

    private final FleetService fleetService;

    public FleetController(FleetService fleetService) {
        this.fleetService = fleetService;
    }

    @GetMapping("/vehicles")
    public List<VehicleDto> listVehicles() {
        return fleetService.listVehicles();
    }

    @PostMapping("/vehicles")
    @ResponseStatus(HttpStatus.CREATED)
    public VehicleDto createVehicle(@Valid @RequestBody CreateVehicleRequest request) {
        return fleetService.createVehicle(request.plate(), request.seats(), request.type(), request.notes());
    }

    @PutMapping("/vehicles/{vehicleId}")
    public VehicleDto updateVehicle(@PathVariable Long vehicleId,
                                    @Valid @RequestBody UpdateVehicleRequest request) {
        return fleetService.updateVehicle(vehicleId, request.plate(), request.seats(), request.type(), request.notes());
    }

    @DeleteMapping("/vehicles/{vehicleId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteVehicle(@PathVariable Long vehicleId) {
        fleetService.deleteVehicle(vehicleId);
    }

    @GetMapping("/vehicles/{vehicleId}/deadlines")
    public List<VehicleDeadlineDto> listDeadlines(@PathVariable Long vehicleId) {
        return fleetService.listDeadlines(vehicleId);
    }

    @GetMapping("/deadlines/upcoming")
    public List<VehicleDeadlineDto> upcomingDeadlines(
        @RequestParam(defaultValue = "30") @Min(1) @Max(365) int withinDays) {
        return fleetService.listUpcomingDeadlines(withinDays);
    }

    @GetMapping("/deadlines/overdue")
    public List<VehicleDeadlineDto> overdueDeadlines() {
        return fleetService.listOverdueDeadlines();
    }

    @PostMapping("/vehicles/{vehicleId}/deadlines")
    @ResponseStatus(HttpStatus.CREATED)
    public VehicleDeadlineDto createDeadline(@PathVariable Long vehicleId,
                                             @Valid @RequestBody SaveDeadlineRequest request) {
        return fleetService.createDeadline(
            vehicleId,
            request.type(),
            request.title(),
            request.description(),
            request.dueDate(),
            request.status(),
            request.cost(),
            request.currency(),
            request.notes(),
            request.paymentDate(),
            request.executionDate()
        );
    }

    @PutMapping("/deadlines/{deadlineId}")
    public VehicleDeadlineDto updateDeadline(@PathVariable Long deadlineId,
                                             @Valid @RequestBody SaveDeadlineRequest request) {
        return fleetService.updateDeadline(
            deadlineId,
            request.type(),
            request.title(),
            request.description(),
            request.dueDate(),
            request.status(),
            request.cost(),
            request.currency(),
            request.notes(),
            request.paymentDate(),
            request.executionDate()
        );
    }

    @DeleteMapping("/deadlines/{deadlineId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteDeadline(@PathVariable Long deadlineId) {
        fleetService.deleteDeadline(deadlineId);
    }

    @GetMapping("/vehicles/{vehicleId}/unavailabilities")
    public List<VehicleUnavailabilityDto> listUnavailabilities(@PathVariable Long vehicleId) {
        return fleetService.listUnavailabilities(vehicleId);
    }

    @PostMapping("/vehicles/{vehicleId}/unavailabilities")
    @ResponseStatus(HttpStatus.CREATED)
    public VehicleUnavailabilityDto createUnavailability(@PathVariable Long vehicleId,
                                                         @Valid @RequestBody SaveUnavailabilityRequest request) {
        return fleetService.createUnavailability(
            vehicleId,
            request.startDate(),
            request.endDate(),
            request.reason()
        );
    }

    @PutMapping("/unavailabilities/{unavailabilityId}")
    public VehicleUnavailabilityDto updateUnavailability(@PathVariable Long unavailabilityId,
                                                         @Valid @RequestBody SaveUnavailabilityRequest request) {
        return fleetService.updateUnavailability(
            unavailabilityId,
            request.startDate(),
            request.endDate(),
            request.reason()
        );
    }

    @DeleteMapping("/unavailabilities/{unavailabilityId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUnavailability(@PathVariable Long unavailabilityId) {
        fleetService.deleteUnavailability(unavailabilityId);
    }

    @ExceptionHandler(FleetValidationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleValidation(FleetValidationException exception) {
        return new ErrorResponse(exception.getMessage());
    }

    @ExceptionHandler({VehicleNotFoundException.class, DeadlineNotFoundException.class, UnavailabilityNotFoundException.class})
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleNotFound(RuntimeException exception) {
        return new ErrorResponse(exception.getMessage());
    }

    record CreateVehicleRequest(@NotBlank String plate,
                                @NotNull Integer seats,
                                @NotNull VehicleType type,
                                String notes) {
    }

    record UpdateVehicleRequest(@NotBlank String plate,
                                @NotNull Integer seats,
                                @NotNull VehicleType type,
                                String notes) {
    }

    record SaveDeadlineRequest(@NotNull DeadlineType type,
                               @NotBlank String title,
                               String description,
                               @NotNull LocalDate dueDate,
                               @NotNull DeadlineStatus status,
                               @NotNull BigDecimal cost,
                               @NotBlank String currency,
                               String notes,
                               LocalDate paymentDate,
                               LocalDate executionDate) {
    }

    record SaveUnavailabilityRequest(@NotNull LocalDate startDate,
                                     @NotNull LocalDate endDate,
                                     @NotBlank String reason) {
    }

    record ErrorResponse(String message) {
    }
}
