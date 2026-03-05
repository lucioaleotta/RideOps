package com.rideops.identity.adapters.in;

import com.rideops.identity.application.admin.CreateUserCommand;
import com.rideops.identity.application.admin.CreateUserUseCase;
import com.rideops.identity.application.admin.UserAdminNotFoundException;
import com.rideops.identity.application.admin.UserAdminValidationException;
import com.rideops.identity.application.admin.UserSummaryDto;
import com.rideops.identity.domain.UserRole;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/gestionale/drivers")
@PreAuthorize("hasAnyRole('ADMIN','GESTIONALE')")
public class GestionaleDriverController {

    private final CreateUserUseCase createUserUseCase;

    public GestionaleDriverController(CreateUserUseCase createUserUseCase) {
        this.createUserUseCase = createUserUseCase;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserSummaryDto createDriver(@Valid @RequestBody CreateDriverRequest request) {
        return createUserUseCase.execute(
            new CreateUserCommand(request.email(), request.password(), UserRole.DRIVER)
        );
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

    record CreateDriverRequest(@NotBlank @Email String email,
                               @NotBlank String password) {
    }

    record ErrorResponse(String message) {
    }
}