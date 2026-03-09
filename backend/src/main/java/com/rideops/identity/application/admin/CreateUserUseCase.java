package com.rideops.identity.application.admin;

import com.rideops.identity.adapters.out.UserEntity;
import com.rideops.identity.domain.UserRole;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.regex.Pattern;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class CreateUserUseCase {

    private static final Pattern EMAIL_PATTERN =
        Pattern.compile("^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$", Pattern.CASE_INSENSITIVE);

    private static final Pattern USER_ID_PATTERN =
        Pattern.compile("^[A-Z0-9._-]{3,40}$", Pattern.CASE_INSENSITIVE);

    private static final Pattern PASSWORD_PATTERN =
        Pattern.compile("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z\\d]).{8,}$");

    private static final Pattern MOBILE_PHONE_PATTERN =
        Pattern.compile("^[+0-9][0-9\\s-]{7,30}$");

    private final UserAdminRepositoryPort userAdminRepositoryPort;
    private final PasswordEncoder passwordEncoder;

    public CreateUserUseCase(UserAdminRepositoryPort userAdminRepositoryPort,
                             PasswordEncoder passwordEncoder) {
        this.userAdminRepositoryPort = userAdminRepositoryPort;
        this.passwordEncoder = passwordEncoder;
    }

    public UserSummaryDto execute(CreateUserCommand command) {
        String userId = normalizeUserId(command.userId());
        String email = normalizeEmail(command.email());
        validateUserId(userId);
        validateEmail(email);
        validatePassword(command.rawPassword());
        validateRole(command.role());

        DriverProfile profile = validateAndBuildProfile(command);

        if (userAdminRepositoryPort.existsByUserIdIgnoreCase(userId)) {
            throw new UserAdminValidationException("User ID already exists");
        }

        if (userAdminRepositoryPort.existsByEmailIgnoreCase(email)) {
            throw new UserAdminValidationException("Email already exists");
        }

        UserEntity userEntity = new UserEntity();
        userEntity.setUserId(userId);
        userEntity.setEmail(email);
        userEntity.setPasswordHash(passwordEncoder.encode(command.rawPassword()));
        userEntity.setRole(command.role());
        userEntity.setEnabled(true);
        userEntity.setFirstName(profile.firstName());
        userEntity.setLastName(profile.lastName());
        userEntity.setBirthDate(profile.birthDate());
        userEntity.setLicenseNumber(profile.licenseNumber());
        userEntity.setLicenseTypesJson(DriverProfileJson.writeStringList(profile.licenseTypes()));
        userEntity.setResidentialAddressesJson(DriverProfileJson.writeStringList(profile.residentialAddresses()));
        userEntity.setMobilePhone(profile.mobilePhone());
        userEntity.setLicenseExpiryDate(profile.licenseExpiryDate());

        return UserAdminMapper.toDto(userAdminRepositoryPort.save(userEntity));
    }

    DriverProfile validateAndBuildProfile(CreateUserCommand command) {
        if (command.role() != UserRole.DRIVER) {
            return DriverProfile.empty();
        }

        return validateAndBuildDriverProfile(
            command.firstName(),
            command.lastName(),
            command.birthDate(),
            command.licenseNumber(),
            command.licenseTypes(),
            command.residentialAddresses(),
            command.mobilePhone(),
            command.licenseExpiryDate()
        );
    }

    DriverProfile validateAndBuildDriverProfile(String firstNameRaw,
                                                String lastNameRaw,
                                                LocalDate birthDateRaw,
                                                String licenseNumberRaw,
                                                List<String> licenseTypesRaw,
                                                List<String> residentialAddressesRaw,
                                                String mobilePhoneRaw,
                                                LocalDate licenseExpiryDateRaw) {
        String firstName = normalizeRequiredText(firstNameRaw, "First name is required");
        String lastName = normalizeRequiredText(lastNameRaw, "Last name is required");
        String licenseNumber = normalizeRequiredText(licenseNumberRaw, "License number is required");
        String mobilePhone = normalizeRequiredText(mobilePhoneRaw, "Mobile phone is required");
        LocalDate birthDate = requireDate(birthDateRaw, "Birth date is required");
        LocalDate licenseExpiryDate = requireDate(licenseExpiryDateRaw, "License expiry date is required");

        if (birthDate.isAfter(LocalDate.now())) {
            throw new UserAdminValidationException("Birth date cannot be in the future");
        }

        if (licenseExpiryDate.isBefore(LocalDate.now().minusYears(20))) {
            throw new UserAdminValidationException("License expiry date is not valid");
        }

        if (!MOBILE_PHONE_PATTERN.matcher(mobilePhone).matches()) {
            throw new UserAdminValidationException("Invalid mobile phone format");
        }

        List<String> normalizedLicenseTypes = normalizeNonEmptyList(licenseTypesRaw, "At least one license type is required");
        List<String> normalizedAddresses = normalizeNonEmptyList(residentialAddressesRaw, "At least one residential address is required");

        return new DriverProfile(
            firstName,
            lastName,
            birthDate,
            licenseNumber,
            normalizedLicenseTypes,
            normalizedAddresses,
            mobilePhone,
            licenseExpiryDate
        );
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            return "";
        }
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String normalizeUserId(String userId) {
        if (userId == null) {
            return "";
        }
        return userId.trim().toLowerCase(Locale.ROOT);
    }

    private void validateUserId(String userId) {
        if (!USER_ID_PATTERN.matcher(userId).matches()) {
            throw new UserAdminValidationException(
                "User ID must be 3-40 chars and contain only letters, numbers, dot, underscore or dash"
            );
        }
    }

    private void validateEmail(String email) {
        if (!EMAIL_PATTERN.matcher(email).matches()) {
            throw new UserAdminValidationException("Invalid email format");
        }
    }

    private void validatePassword(String rawPassword) {
        if (rawPassword == null || !PASSWORD_PATTERN.matcher(rawPassword).matches()) {
            throw new UserAdminValidationException(
                "Password must be at least 8 chars with upper, lower, digit and special char"
            );
        }
    }

    private void validateRole(UserRole role) {
        if (role == null) {
            throw new UserAdminValidationException("Role is required");
        }
    }

    private String normalizeRequiredText(String value, String errorMessage) {
        if (value == null || value.trim().isEmpty()) {
            throw new UserAdminValidationException(errorMessage);
        }
        return value.trim();
    }

    private LocalDate requireDate(LocalDate value, String errorMessage) {
        if (value == null) {
            throw new UserAdminValidationException(errorMessage);
        }
        return value;
    }

    private List<String> normalizeNonEmptyList(List<String> values, String errorMessage) {
        if (values == null || values.isEmpty()) {
            throw new UserAdminValidationException(errorMessage);
        }

        List<String> normalized = new ArrayList<>();
        for (String value : values) {
            if (value == null) {
                continue;
            }
            String trimmed = value.trim();
            if (!trimmed.isEmpty()) {
                normalized.add(trimmed);
            }
        }

        if (normalized.isEmpty()) {
            throw new UserAdminValidationException(errorMessage);
        }
        return normalized;
    }

    record DriverProfile(
        String firstName,
        String lastName,
        LocalDate birthDate,
        String licenseNumber,
        List<String> licenseTypes,
        List<String> residentialAddresses,
        String mobilePhone,
        LocalDate licenseExpiryDate
    ) {
        static DriverProfile empty() {
            return new DriverProfile(null, null, null, null, List.of(), List.of(), null, null);
        }
    }
}
