package com.rideops.services.adapters.in;

import com.rideops.identity.application.IdentityUserDetails;
import com.rideops.services.application.CloseServiceUseCase;
import com.rideops.services.application.ListDriverServicesUseCase;
import com.rideops.services.application.ServiceDto;
import com.rideops.services.application.ServiceNotFoundException;
import com.rideops.services.application.ServiceValidationException;
import com.rideops.services.domain.ServiceStatus;
import com.rideops.services.domain.ServiceType;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Objects;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/driver/services")
@PreAuthorize("hasAnyRole('ADMIN','DRIVER','DRIVER_FREELANCER')")
public class DriverServicesController {

    private final ListDriverServicesUseCase listDriverServicesUseCase;
    private final CloseServiceUseCase closeServiceUseCase;

    public DriverServicesController(ListDriverServicesUseCase listDriverServicesUseCase,
                                    CloseServiceUseCase closeServiceUseCase) {
        this.listDriverServicesUseCase = listDriverServicesUseCase;
        this.closeServiceUseCase = closeServiceUseCase;
    }

    @GetMapping
    public List<ServiceDto> listFiltered(@AuthenticationPrincipal IdentityUserDetails user,
                                         @RequestParam(required = false)
                                         @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
                                         LocalDateTime from,
                                         @RequestParam(required = false)
                                         @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
                                         LocalDateTime to,
                                         @RequestParam(required = false) ServiceStatus status,
                                         @RequestParam(required = false) ServiceType type) {
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Non autorizzato");
        }
        // Single entry point for driver service listing, optionally constrained by time/status/type.
        return listDriverServicesUseCase.execute(user.getId(), from, to, status, type);
    }

    @PatchMapping("/{serviceId}/close")
    public ServiceDto close(@PathVariable Long serviceId,
                            @AuthenticationPrincipal IdentityUserDetails user) {
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Non autorizzato");
        }
        return closeServiceUseCase.executeByDriver(serviceId, Objects.requireNonNull(user.getId(), "userId obbligatorio"));
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

    record ErrorResponse(String message) {
    }
}