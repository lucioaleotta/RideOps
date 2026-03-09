package com.rideops.identity.adapters.in;

import com.rideops.identity.application.admin.CreateUserCommand;
import com.rideops.identity.application.admin.CreateUserUseCase;
import com.rideops.identity.application.admin.ListDriversUseCase;
import com.rideops.identity.application.admin.SetDriverEnabledUseCase;
import com.rideops.identity.application.admin.UpdateDriverUseCase;
import com.rideops.identity.application.admin.UserAdminNotFoundException;
import com.rideops.identity.application.admin.UserAdminValidationException;
import com.rideops.identity.application.admin.UserSummaryDto;
import com.rideops.identity.domain.UserRole;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/gestionale/drivers")
@PreAuthorize("hasAnyRole('ADMIN','GESTIONALE')")
public class GestionaleDriverController {

    private final CreateUserUseCase createUserUseCase;
    private final ListDriversUseCase listDriversUseCase;
    private final UpdateDriverUseCase updateDriverUseCase;
    private final SetDriverEnabledUseCase setDriverEnabledUseCase;

    public GestionaleDriverController(CreateUserUseCase createUserUseCase,
                                      ListDriversUseCase listDriversUseCase,
                                      UpdateDriverUseCase updateDriverUseCase,
                                      SetDriverEnabledUseCase setDriverEnabledUseCase) {
        this.createUserUseCase = createUserUseCase;
        this.listDriversUseCase = listDriversUseCase;
        this.updateDriverUseCase = updateDriverUseCase;
        this.setDriverEnabledUseCase = setDriverEnabledUseCase;
    }

    @GetMapping
    public List<UserSummaryDto> listDrivers(@RequestParam(defaultValue = "false") boolean includeDeleted) {
        return listDriversUseCase.execute(includeDeleted);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserSummaryDto createDriver(@Valid @RequestBody CreateDriverRequest request) {
        return createUserUseCase.execute(toCreateCommand(request));
    }

    @PutMapping("/{driverId}")
    public UserSummaryDto updateDriver(@PathVariable Long driverId,
                                       @Valid @RequestBody UpdateDriverRequest request) {
        return updateDriverUseCase.execute(
            driverId,
            request.firstName(),
            request.lastName(),
            request.birthDate(),
            request.licenseNumber(),
            request.licenseTypes(),
            request.residentialAddresses(),
            request.mobilePhone(),
            request.licenseExpiryDate()
        );
    }

    @DeleteMapping("/{driverId}")
    public UserSummaryDto deleteDriver(@PathVariable Long driverId) {
        return setDriverEnabledUseCase.execute(driverId, false);
    }

    @PatchMapping("/{driverId}/enabled")
    public UserSummaryDto setDriverEnabled(@PathVariable Long driverId,
                                           @Valid @RequestBody UpdateEnabledRequest request) {
        return setDriverEnabledUseCase.execute(driverId, request.enabled());
    }

    @ExceptionHandler(UserAdminValidationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleValidation(UserAdminValidationException exception) {
        return new ErrorResponse(exception.getMessage());
    }

    @ExceptionHandler(UserAdminNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleNotFound(UserAdminNotFoundException exception) {
        return new ErrorResponse(exception.getMessage());
    }

    private CreateUserCommand toCreateCommand(CreateDriverRequest request) {
        return new CreateUserCommand(
            request.userId(),
            request.email(),
            request.password(),
            UserRole.DRIVER,
            request.firstName(),
            request.lastName(),
            request.birthDate(),
            request.licenseNumber(),
            request.licenseTypes(),
            request.residentialAddresses(),
            request.mobilePhone(),
            request.licenseExpiryDate()
        );
    }

    record CreateDriverRequest(@NotBlank String userId,
                               @NotBlank @Email String email,
                               @NotBlank String password,
                               @NotBlank String firstName,
                               @NotBlank String lastName,
                               @NotNull LocalDate birthDate,
                               @NotBlank String licenseNumber,
                               @NotEmpty List<@NotBlank String> licenseTypes,
                               @NotEmpty List<@NotBlank String> residentialAddresses,
                               @NotBlank String mobilePhone,
                               @NotNull LocalDate licenseExpiryDate) {
    }

    record UpdateDriverRequest(@NotBlank String firstName,
                               @NotBlank String lastName,
                               @NotNull LocalDate birthDate,
                               @NotBlank String licenseNumber,
                               @NotEmpty List<@NotBlank String> licenseTypes,
                               @NotEmpty List<@NotBlank String> residentialAddresses,
                               @NotBlank String mobilePhone,
                               @NotNull LocalDate licenseExpiryDate) {
    }

    record UpdateEnabledRequest(@NotNull Boolean enabled) {
    }

    record ErrorResponse(String message) {
    }
}