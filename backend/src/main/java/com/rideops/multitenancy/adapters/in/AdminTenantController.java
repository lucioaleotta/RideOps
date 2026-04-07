package com.rideops.multitenancy.adapters.in;

import com.rideops.multitenancy.SubscriptionPlan;
import com.rideops.multitenancy.SubscriptionStatus;
import com.rideops.multitenancy.TenantOperationalStatus;
import com.rideops.multitenancy.application.CreateTenantCommand;
import com.rideops.multitenancy.application.CreateTenantUseCase;
import com.rideops.multitenancy.application.ListTenantsUseCase;
import com.rideops.multitenancy.application.TenantDto;
import com.rideops.multitenancy.application.TenantNotFoundException;
import com.rideops.multitenancy.application.TenantProvisioningResultDto;
import com.rideops.multitenancy.application.TenantValidationException;
import com.rideops.multitenancy.application.UpdateTenantStatusUseCase;
import com.rideops.multitenancy.application.UpdateTenantCommand;
import com.rideops.multitenancy.application.UpdateTenantUseCase;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
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
@RequestMapping("/admin/tenants")
@PreAuthorize("hasRole('ADMIN')")
public class AdminTenantController {

    private final CreateTenantUseCase createTenantUseCase;
    private final ListTenantsUseCase listTenantsUseCase;
    private final UpdateTenantStatusUseCase updateTenantStatusUseCase;
    private final UpdateTenantUseCase updateTenantUseCase;

    public AdminTenantController(CreateTenantUseCase createTenantUseCase,
                                 ListTenantsUseCase listTenantsUseCase,
                                 UpdateTenantStatusUseCase updateTenantStatusUseCase,
                                 UpdateTenantUseCase updateTenantUseCase) {
        this.createTenantUseCase = createTenantUseCase;
        this.listTenantsUseCase = listTenantsUseCase;
        this.updateTenantStatusUseCase = updateTenantStatusUseCase;
        this.updateTenantUseCase = updateTenantUseCase;
    }

    @GetMapping
    public List<TenantDto> list(@RequestParam(name = "q", required = false) String query) {
        return listTenantsUseCase.execute(query);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TenantProvisioningResultDto create(@Valid @RequestBody CreateTenantRequest request) {
        return createTenantUseCase.execute(new CreateTenantCommand(
            request.businessName(),
            request.vatNumber(),
            request.taxCode(),
            request.sdiCode(),
            request.pecEmail(),
            request.contactEmail(),
            request.contactPhone(),
            request.contactPerson(),
            request.addressLine(),
            request.addressCity(),
            request.addressProvince(),
            request.addressPostalCode(),
            request.addressCountry(),
            request.timezone(),
            request.currency(),
            request.language(),
            request.notifyEmailEnabled(),
            request.notifySmsEnabled(),
            request.notifyPushEnabled(),
            request.subscriptionStatus(),
            request.subscriptionPlan(),
            request.logoUrl(),
            request.primaryColor(),
            request.secondaryColor()
        ));
    }

    @PatchMapping("/{tenantId}/status")
    public TenantDto updateStatus(@PathVariable Long tenantId,
                                  @Valid @RequestBody UpdateTenantStatusRequest request) {
        return updateTenantStatusUseCase.execute(tenantId, request.status());
    }

    @PutMapping("/{tenantId}")
    public TenantDto update(@PathVariable Long tenantId,
                            @Valid @RequestBody UpdateTenantRequest request) {
        return updateTenantUseCase.execute(new UpdateTenantCommand(
            tenantId,
            request.businessName(),
            request.vatNumber(),
            request.taxCode(),
            request.sdiCode(),
            request.pecEmail(),
            request.contactEmail(),
            request.contactPhone(),
            request.contactPerson(),
            request.addressLine(),
            request.addressCity(),
            request.addressProvince(),
            request.addressPostalCode(),
            request.addressCountry(),
            request.timezone(),
            request.currency(),
            request.language(),
            request.notifyEmailEnabled(),
            request.notifySmsEnabled(),
            request.notifyPushEnabled(),
            request.subscriptionStatus(),
            request.subscriptionPlan(),
            request.logoUrl(),
            request.primaryColor(),
            request.secondaryColor()
        ));
    }

    @ExceptionHandler(TenantValidationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleValidation(TenantValidationException exception) {
        return new ErrorResponse(exception.getMessage());
    }

    @ExceptionHandler(TenantNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleNotFound(TenantNotFoundException exception) {
        return new ErrorResponse(exception.getMessage());
    }

    record CreateTenantRequest(
        @NotBlank String businessName,
        String vatNumber,
        String taxCode,
        String sdiCode,
        @Email String pecEmail,
        @NotBlank @Email String contactEmail,
        String contactPhone,
        String contactPerson,
        String addressLine,
        String addressCity,
        String addressProvince,
        String addressPostalCode,
        String addressCountry,
        String timezone,
        String currency,
        String language,
        Boolean notifyEmailEnabled,
        Boolean notifySmsEnabled,
        Boolean notifyPushEnabled,
        SubscriptionStatus subscriptionStatus,
        SubscriptionPlan subscriptionPlan,
        String logoUrl,
        String primaryColor,
        String secondaryColor
    ) {
    }

    record UpdateTenantStatusRequest(@NotNull TenantOperationalStatus status) {
    }

    record UpdateTenantRequest(
        @NotBlank String businessName,
        String vatNumber,
        String taxCode,
        String sdiCode,
        @Email String pecEmail,
        @NotBlank @Email String contactEmail,
        String contactPhone,
        String contactPerson,
        String addressLine,
        String addressCity,
        String addressProvince,
        String addressPostalCode,
        String addressCountry,
        String timezone,
        String currency,
        String language,
        Boolean notifyEmailEnabled,
        Boolean notifySmsEnabled,
        Boolean notifyPushEnabled,
        SubscriptionStatus subscriptionStatus,
        SubscriptionPlan subscriptionPlan,
        String logoUrl,
        String primaryColor,
        String secondaryColor
    ) {
    }

    record ErrorResponse(String message) {
    }
}
