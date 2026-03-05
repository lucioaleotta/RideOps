package com.rideops.services.adapters.in;

import com.rideops.services.application.CloseServiceUseCase;
import com.rideops.services.application.CreateServiceCommand;
import com.rideops.services.application.CreateServiceUseCase;
import com.rideops.services.application.DeleteServiceUseCase;
import com.rideops.services.application.GetServiceUseCase;
import com.rideops.services.application.ListServicesUseCase;
import com.rideops.services.application.ServiceDto;
import com.rideops.services.application.ServiceNotFoundException;
import com.rideops.services.application.ServiceValidationException;
import com.rideops.services.application.UpdateServiceCommand;
import com.rideops.services.application.UpdateServiceUseCase;
import com.rideops.services.domain.ServiceStatus;
import com.rideops.services.domain.ServiceType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
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
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/services")
@PreAuthorize("hasAnyRole('ADMIN','GESTIONALE')")
public class ServiceController {

    private final CreateServiceUseCase createServiceUseCase;
    private final UpdateServiceUseCase updateServiceUseCase;
    private final DeleteServiceUseCase deleteServiceUseCase;
    private final CloseServiceUseCase closeServiceUseCase;
    private final ListServicesUseCase listServicesUseCase;
    private final GetServiceUseCase getServiceUseCase;

    public ServiceController(CreateServiceUseCase createServiceUseCase,
                             UpdateServiceUseCase updateServiceUseCase,
                             DeleteServiceUseCase deleteServiceUseCase,
                             CloseServiceUseCase closeServiceUseCase,
                             ListServicesUseCase listServicesUseCase,
                             GetServiceUseCase getServiceUseCase) {
        this.createServiceUseCase = createServiceUseCase;
        this.updateServiceUseCase = updateServiceUseCase;
        this.deleteServiceUseCase = deleteServiceUseCase;
        this.closeServiceUseCase = closeServiceUseCase;
        this.listServicesUseCase = listServicesUseCase;
        this.getServiceUseCase = getServiceUseCase;
    }

    @GetMapping
    public List<ServiceDto> list() {
        return listServicesUseCase.execute();
    }

    @GetMapping("/{serviceId}")
    public ServiceDto getById(@PathVariable Long serviceId) {
        return getServiceUseCase.execute(serviceId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ServiceDto create(@Valid @RequestBody CreateServiceRequest request) {
        return createServiceUseCase.execute(
            new CreateServiceCommand(
                request.startAt(),
                request.pickupLocation(),
                request.destination(),
                request.type(),
                request.durationHours(),
                request.notes(),
                request.price(),
                request.status()
            )
        );
    }

    @PutMapping("/{serviceId}")
    public ServiceDto update(@PathVariable Long serviceId,
                             @Valid @RequestBody UpdateServiceRequest request) {
        return updateServiceUseCase.execute(
            serviceId,
            new UpdateServiceCommand(
                request.startAt(),
                request.pickupLocation(),
                request.destination(),
                request.type(),
                request.durationHours(),
                request.notes(),
                request.price(),
                request.status()
            )
        );
    }

    @DeleteMapping("/{serviceId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable Long serviceId) {
        deleteServiceUseCase.execute(serviceId);
    }

    @PatchMapping("/{serviceId}/close")
    public ServiceDto close(@PathVariable Long serviceId) {
        return closeServiceUseCase.execute(serviceId);
    }

    @ExceptionHandler(ServiceValidationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleValidation(ServiceValidationException exception) {
        return new ErrorResponse(exception.getMessage());
    }

    @ExceptionHandler(ServiceNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleNotFound(ServiceNotFoundException exception) {
        return new ErrorResponse(exception.getMessage());
    }

    record CreateServiceRequest(@NotNull LocalDateTime startAt,
                                @NotBlank String pickupLocation,
                                @NotBlank String destination,
                                @NotNull ServiceType type,
                                Integer durationHours,
                                String notes,
                                BigDecimal price,
                                @NotNull ServiceStatus status) {
    }

    record UpdateServiceRequest(@NotNull LocalDateTime startAt,
                                @NotBlank String pickupLocation,
                                @NotBlank String destination,
                                @NotNull ServiceType type,
                                Integer durationHours,
                                String notes,
                                BigDecimal price,
                                @NotNull ServiceStatus status) {
    }

    record ErrorResponse(String message) {
    }
}