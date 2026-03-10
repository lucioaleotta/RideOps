package com.rideops.fleet.adapters.in;

import com.rideops.fleet.application.DeadlineOccurrenceNotFoundException;
import com.rideops.fleet.application.DeadlinePlanNotFoundException;
import com.rideops.fleet.application.FleetValidationException;
import com.rideops.fleet.application.PlanSyncResultDto;
import com.rideops.fleet.application.VehicleDeadlineOccurrenceDto;
import com.rideops.fleet.application.VehicleDeadlinePlanDto;
import com.rideops.fleet.application.VehicleDetailDto;
import com.rideops.fleet.application.VehicleManagementService;
import com.rideops.fleet.application.VehicleNotFoundException;
import com.rideops.fleet.domain.DeadlineStatus;
import com.rideops.fleet.domain.DeadlineType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
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
public class VehicleManagementController {

    private final VehicleManagementService vehicleManagementService;

    public VehicleManagementController(VehicleManagementService vehicleManagementService) {
        this.vehicleManagementService = vehicleManagementService;
    }

    @GetMapping("/vehicles/{vehicleId}/detail")
    public VehicleDetailDto getVehicleDetail(@PathVariable Long vehicleId,
                                             @RequestParam(defaultValue = "30") @Min(1) @Max(365) int withinDays) {
        return vehicleManagementService.getVehicleDetail(vehicleId, withinDays);
    }

    @PostMapping("/vehicles/{vehicleId}/occurrences")
    @ResponseStatus(HttpStatus.CREATED)
    public VehicleDeadlineOccurrenceDto addOccurrence(@PathVariable Long vehicleId,
                                                      @Valid @RequestBody SaveOccurrenceRequest request) {
        return vehicleManagementService.addOccurrence(
            vehicleId,
            request.planId(),
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

    @PutMapping("/occurrences/{occurrenceId}")
    public VehicleDeadlineOccurrenceDto updateOccurrence(@PathVariable Long occurrenceId,
                                                         @Valid @RequestBody SaveOccurrenceRequest request) {
        return vehicleManagementService.updateOccurrence(
            occurrenceId,
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

    @PatchMapping("/occurrences/{occurrenceId}/paid")
    public VehicleDeadlineOccurrenceDto markPaid(@PathVariable Long occurrenceId,
                                                 @RequestBody(required = false) MarkActionRequest request) {
        return vehicleManagementService.markOccurrencePaid(
            occurrenceId,
            request != null ? request.date() : null
        );
    }

    @PatchMapping("/occurrences/{occurrenceId}/completed")
    public VehicleDeadlineOccurrenceDto markCompleted(@PathVariable Long occurrenceId,
                                                      @RequestBody(required = false) MarkActionRequest request) {
        return vehicleManagementService.markOccurrenceCompleted(
            occurrenceId,
            request != null ? request.date() : null
        );
    }

    @PatchMapping("/occurrences/{occurrenceId}/cancel")
    public VehicleDeadlineOccurrenceDto cancelOccurrence(@PathVariable Long occurrenceId) {
        return vehicleManagementService.cancelOccurrence(occurrenceId);
    }

    @DeleteMapping("/occurrences/{occurrenceId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteOccurrence(@PathVariable Long occurrenceId) {
        vehicleManagementService.deleteOccurrence(occurrenceId);
    }

    @PostMapping("/vehicles/{vehicleId}/plans")
    @ResponseStatus(HttpStatus.CREATED)
    public VehicleDeadlinePlanDto addPlan(@PathVariable Long vehicleId,
                                          @Valid @RequestBody SavePlanRequest request) {
        return vehicleManagementService.addPlan(
            vehicleId,
            request.type(),
            request.title(),
            request.description(),
            request.recurrenceMonths(),
            request.nextDueDate(),
            request.standardCost(),
            request.currency(),
            request.notes()
        );
    }

    @PutMapping("/plans/{planId}")
    public VehicleDeadlinePlanDto updatePlan(@PathVariable Long planId,
                                             @Valid @RequestBody SavePlanRequest request) {
        return vehicleManagementService.updatePlan(
            planId,
            request.type(),
            request.title(),
            request.description(),
            request.recurrenceMonths(),
            request.nextDueDate(),
            request.standardCost(),
            request.currency(),
            request.notes()
        );
    }

    @PatchMapping("/plans/{planId}/deactivate")
    public VehicleDeadlinePlanDto deactivatePlan(@PathVariable Long planId) {
        return vehicleManagementService.deactivatePlan(planId);
    }

    @PatchMapping("/plans/{planId}/reactivate")
    public VehicleDeadlinePlanDto reactivatePlan(@PathVariable Long planId) {
        return vehicleManagementService.reactivatePlan(planId);
    }

    @PostMapping("/plans/sync-missing-occurrences")
    @PreAuthorize("hasRole('ADMIN')")
    public PlanSyncResultDto syncMissingOccurrences() {
        return vehicleManagementService.syncMissingOccurrencesFromActivePlans();
    }

    @ExceptionHandler(FleetValidationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleValidation(FleetValidationException exception) {
        return new ErrorResponse(exception.getMessage());
    }

    @ExceptionHandler({VehicleNotFoundException.class, DeadlineOccurrenceNotFoundException.class, DeadlinePlanNotFoundException.class})
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleNotFound(RuntimeException exception) {
        return new ErrorResponse(exception.getMessage());
    }

    record SaveOccurrenceRequest(Long planId,
                                 @NotNull DeadlineType type,
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

    record SavePlanRequest(@NotNull DeadlineType type,
                           @NotBlank String title,
                           String description,
                           @NotNull Integer recurrenceMonths,
                           @NotNull LocalDate nextDueDate,
                           @NotNull BigDecimal standardCost,
                           @NotBlank String currency,
                           String notes) {
    }

    record MarkActionRequest(LocalDate date) {
    }

    record ErrorResponse(String message) {
    }
}
