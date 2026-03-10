package com.rideops.identity.adapters.in;

import com.rideops.identity.application.IdentityUserDetails;
import com.rideops.identity.application.admin.GetDriverProfileUseCase;
import com.rideops.identity.application.admin.UpdateOwnDriverProfileUseCase;
import com.rideops.identity.application.admin.UserSummaryDto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/driver/profile")
@PreAuthorize("hasAnyRole('ADMIN','DRIVER')")
public class DriverProfileController {

    private final GetDriverProfileUseCase getDriverProfileUseCase;
    private final UpdateOwnDriverProfileUseCase updateOwnDriverProfileUseCase;

    public DriverProfileController(GetDriverProfileUseCase getDriverProfileUseCase,
                                   UpdateOwnDriverProfileUseCase updateOwnDriverProfileUseCase) {
        this.getDriverProfileUseCase = getDriverProfileUseCase;
        this.updateOwnDriverProfileUseCase = updateOwnDriverProfileUseCase;
    }

    @GetMapping
    public UserSummaryDto getProfile(@AuthenticationPrincipal IdentityUserDetails user) {
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        return getDriverProfileUseCase.execute(user.getId());
    }

    @PutMapping
    public UserSummaryDto updateProfile(@AuthenticationPrincipal IdentityUserDetails user,
                                        @Valid @RequestBody UpdateDriverProfileRequest request) {
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }

        return updateOwnDriverProfileUseCase.execute(
            user.getId(),
            request.email(),
            request.licenseTypes(),
            request.residentialAddresses(),
            request.mobilePhone(),
            request.licenseExpiryDate()
        );
    }

    record UpdateDriverProfileRequest(@NotBlank @Email String email,
                                      @NotEmpty List<@NotBlank String> licenseTypes,
                                      @NotEmpty List<@NotBlank String> residentialAddresses,
                                      @NotBlank String mobilePhone,
                                      @NotNull LocalDate licenseExpiryDate) {
    }
}
