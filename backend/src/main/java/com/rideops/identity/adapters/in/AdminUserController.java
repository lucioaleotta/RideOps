package com.rideops.identity.adapters.in;

import com.rideops.identity.application.IdentityUserDetails;
import com.rideops.identity.application.admin.CreateUserCommand;
import com.rideops.identity.application.admin.CreateUserUseCase;
import com.rideops.identity.application.admin.ListUserAdminAuditLogUseCase;
import com.rideops.identity.application.admin.ListUsersUseCase;
import com.rideops.identity.application.admin.SetTemporaryPasswordUseCase;
import com.rideops.identity.application.admin.SetUserEnabledUseCase;
import com.rideops.identity.application.admin.UpdateUserCommand;
import com.rideops.identity.application.admin.UpdateUserUseCase;
import com.rideops.identity.application.admin.UpdateUserRoleUseCase;
import com.rideops.identity.application.admin.UserAdminNotFoundException;
import com.rideops.identity.application.admin.UserAdminValidationException;
import com.rideops.identity.application.admin.UserAdminAuditLogDto;
import com.rideops.identity.application.admin.UserSummaryDto;
import com.rideops.identity.domain.UserRole;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
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
    private final SetTemporaryPasswordUseCase setTemporaryPasswordUseCase;
    private final UpdateUserUseCase updateUserUseCase;
    private final ListUserAdminAuditLogUseCase listUserAdminAuditLogUseCase;

    public AdminUserController(CreateUserUseCase createUserUseCase,
                               ListUsersUseCase listUsersUseCase,
                               UpdateUserRoleUseCase updateUserRoleUseCase,
                               SetUserEnabledUseCase setUserEnabledUseCase,
                               SetTemporaryPasswordUseCase setTemporaryPasswordUseCase,
                               UpdateUserUseCase updateUserUseCase,
                               ListUserAdminAuditLogUseCase listUserAdminAuditLogUseCase) {
        this.createUserUseCase = createUserUseCase;
        this.listUsersUseCase = listUsersUseCase;
        this.updateUserRoleUseCase = updateUserRoleUseCase;
        this.setUserEnabledUseCase = setUserEnabledUseCase;
        this.setTemporaryPasswordUseCase = setTemporaryPasswordUseCase;
        this.updateUserUseCase = updateUserUseCase;
        this.listUserAdminAuditLogUseCase = listUserAdminAuditLogUseCase;
    }

    @GetMapping
    public List<UserSummaryDto> listUsers() {
        return listUsersUseCase.execute();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public UserSummaryDto createUser(@Valid @RequestBody CreateUserRequest request) {
        return createUserUseCase.execute(
            new CreateUserCommand(
                request.userId(),
                request.email(),
                request.password(),
                request.role(),
                request.tenantId(),
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null
            )
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

    @PatchMapping("/{userId}/temporary-password")
    public UserSummaryDto setTemporaryPassword(@PathVariable Long userId,
                                               @Valid @RequestBody SetTemporaryPasswordRequest request) {
        return setTemporaryPasswordUseCase.execute(userId, request.temporaryPassword());
    }

    @PatchMapping("/{userId}")
    public UserSummaryDto updateUser(@PathVariable Long userId,
                                     @Valid @RequestBody UpdateUserRequest request,
                                     @AuthenticationPrincipal IdentityUserDetails principal) {
        return updateUserUseCase.execute(
            userId,
            new UpdateUserCommand(
                request.userId(),
                request.email(),
                request.role(),
                request.enabled(),
                request.newPassword()
            ),
            principal == null ? "unknown" : principal.getUserId(),
            principal == null ? null : principal.getId()
        );
    }

    @GetMapping("/journal")
    public List<UserAdminAuditLogDto> listJournal(@RequestParam(required = false) String date,
                                                   @RequestParam(required = false) String adminUserId) {
        LocalDate dateFilter = null;
        if (date != null && !date.isBlank()) {
            try {
                dateFilter = LocalDate.parse(date.trim());
            } catch (DateTimeParseException e) {
                // SECURITY: non propagare eccezione raw al client (CWE-755 / stack trace leakage)
                throw new org.springframework.web.server.ResponseStatusException(
                    HttpStatus.BAD_REQUEST, "Formato data non valido, usare YYYY-MM-DD");
            }
        }
        return listUserAdminAuditLogUseCase.execute(dateFilter, adminUserId);
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

    record CreateUserRequest(@NotBlank String userId,
                             @NotBlank @Email String email,
                             @NotBlank String password,
                             @NotNull UserRole role,
                             Long tenantId) {
    }

    record UpdateRoleRequest(@NotNull UserRole role) {
    }

    record UpdateEnabledRequest(@NotNull Boolean enabled) {
    }

    record SetTemporaryPasswordRequest(@NotBlank String temporaryPassword) {
    }

    record UpdateUserRequest(@NotBlank String userId,
                             @NotBlank @Email String email,
                             @NotNull UserRole role,
                             @NotNull Boolean enabled,
                             String newPassword) {
    }

    record ErrorResponse(String message) {
    }
}
