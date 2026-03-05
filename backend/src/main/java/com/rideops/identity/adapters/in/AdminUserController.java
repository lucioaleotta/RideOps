package com.rideops.identity.adapters.in;

import com.rideops.identity.application.admin.CreateUserCommand;
import com.rideops.identity.application.admin.CreateUserUseCase;
import com.rideops.identity.application.admin.ListUsersUseCase;
import com.rideops.identity.application.admin.SetUserEnabledUseCase;
import com.rideops.identity.application.admin.UpdateUserRoleUseCase;
import com.rideops.identity.application.admin.UserAdminNotFoundException;
import com.rideops.identity.application.admin.UserAdminValidationException;
import com.rideops.identity.application.admin.UserSummaryDto;
import com.rideops.identity.domain.UserRole;
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
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final CreateUserUseCase createUserUseCase;
    private final ListUsersUseCase listUsersUseCase;
    private final UpdateUserRoleUseCase updateUserRoleUseCase;
    private final SetUserEnabledUseCase setUserEnabledUseCase;

    public AdminUserController(CreateUserUseCase createUserUseCase,
                               ListUsersUseCase listUsersUseCase,
                               UpdateUserRoleUseCase updateUserRoleUseCase,
                               SetUserEnabledUseCase setUserEnabledUseCase) {
        this.createUserUseCase = createUserUseCase;
        this.listUsersUseCase = listUsersUseCase;
        this.updateUserRoleUseCase = updateUserRoleUseCase;
        this.setUserEnabledUseCase = setUserEnabledUseCase;
    }

    @GetMapping
    public List<UserSummaryDto> listUsers() {
        return listUsersUseCase.execute();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserSummaryDto createUser(@Valid @RequestBody CreateUserRequest request) {
        return createUserUseCase.execute(
            new CreateUserCommand(request.email(), request.password(), request.role())
        );
    }

    @PatchMapping("/{userId}/role")
    public UserSummaryDto updateRole(@PathVariable Long userId,
                                     @Valid @RequestBody UpdateRoleRequest request) {
        return updateUserRoleUseCase.execute(userId, request.role());
    }

    @PatchMapping("/{userId}/enabled")
    public UserSummaryDto updateEnabled(@PathVariable Long userId,
                                        @Valid @RequestBody UpdateEnabledRequest request) {
        return setUserEnabledUseCase.execute(userId, request.enabled());
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

    record CreateUserRequest(@NotBlank @Email String email,
                             @NotBlank String password,
                             @NotNull UserRole role) {
    }

    record UpdateRoleRequest(@NotNull UserRole role) {
    }

    record UpdateEnabledRequest(@NotNull Boolean enabled) {
    }

    record ErrorResponse(String message) {
    }
}
