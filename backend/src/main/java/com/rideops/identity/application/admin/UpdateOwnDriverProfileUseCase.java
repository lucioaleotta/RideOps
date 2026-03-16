package com.rideops.identity.application.admin;

import com.rideops.identity.domain.UserRole;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

@Service
public class UpdateOwnDriverProfileUseCase {

    private static final Pattern EMAIL_PATTERN =
        Pattern.compile("^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$", Pattern.CASE_INSENSITIVE);

    private final UserAdminRepositoryPort userAdminRepositoryPort;
    private final CreateUserUseCase createUserUseCase;

    public UpdateOwnDriverProfileUseCase(UserAdminRepositoryPort userAdminRepositoryPort,
                                         CreateUserUseCase createUserUseCase) {
        this.userAdminRepositoryPort = userAdminRepositoryPort;
        this.createUserUseCase = createUserUseCase;
    }

    public UserSummaryDto execute(Long userId,
                                  String email,
                                  List<String> licenseTypes,
                                  List<String> residentialAddresses,
                                  String mobilePhone,
                                  LocalDate licenseExpiryDate) {
        Long safeUserId = Objects.requireNonNull(userId, "userId obbligatorio");
        var user = userAdminRepositoryPort.findById(safeUserId)
            .orElseThrow(() -> new UserAdminNotFoundException("Driver non trovato"));

        if (user.getRole() != UserRole.DRIVER) {
            throw new UserAdminValidationException("L'utente non e` un driver");
        }

        String normalizedEmail = normalizeEmail(email);
        validateEmail(normalizedEmail);
        if (!normalizedEmail.equalsIgnoreCase(user.getEmail())
            && userAdminRepositoryPort.existsByEmailIgnoreCase(normalizedEmail)) {
            throw new UserAdminValidationException("L'email esiste gia`");
        }

        var profile = createUserUseCase.validateAndBuildDriverProfile(
            user.getFirstName(),
            user.getLastName(),
            user.getBirthDate(),
            user.getLicenseNumber(),
            licenseTypes,
            residentialAddresses,
            mobilePhone,
            licenseExpiryDate
        );

        user.setEmail(normalizedEmail);
        user.setLicenseTypesJson(DriverProfileJson.writeStringList(profile.licenseTypes()));
        user.setResidentialAddressesJson(DriverProfileJson.writeStringList(profile.residentialAddresses()));
        user.setMobilePhone(profile.mobilePhone());
        user.setLicenseExpiryDate(profile.licenseExpiryDate());

        return UserAdminMapper.toDto(userAdminRepositoryPort.save(user));
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            return "";
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private void validateEmail(String email) {
        if (!EMAIL_PATTERN.matcher(email).matches()) {
            throw new UserAdminValidationException("Formato email non valido");
        }
    }
}
