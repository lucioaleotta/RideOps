package com.rideops.identity.application.admin;

import com.rideops.identity.adapters.out.UserAdminAuditLogEntity;
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
    private final UserAdminAuditLogPort userAdminAuditLogPort;
    private final PasswordEncoder passwordEncoder;

    public CreateUserUseCase(UserAdminRepositoryPort userAdminRepositoryPort,
                             UserAdminAuditLogPort userAdminAuditLogPort,
                             PasswordEncoder passwordEncoder) {
        this.userAdminRepositoryPort = userAdminRepositoryPort;
        this.userAdminAuditLogPort = userAdminAuditLogPort;
        this.passwordEncoder = passwordEncoder;
    }

    public UserSummaryDto execute(CreateUserCommand command, String adminUserId, Long adminUserDbId) {
        String userId = normalizeUserId(command.userId());
        String email = normalizeEmail(command.email());
        validateUserId(userId);
        validateEmail(email);
        validatePassword(command.rawPassword());
        validateRole(command.role());

        DriverProfile profile = validateAndBuildProfile(command);

        validateTenantConsistency(command.role(), command.tenantId());

        if (userAdminRepositoryPort.existsByUserIdIgnoreCase(userId)) {
            throw new UserAdminValidationException("Lo user ID esiste gia`");
        }

        if (userAdminRepositoryPort.existsByEmailIgnoreCase(email)) {
            throw new UserAdminValidationException("L'email esiste gia`");
        }

        UserEntity userEntity = new UserEntity();
        userEntity.setUserId(userId);
        userEntity.setEmail(email);
        userEntity.setPasswordHash(passwordEncoder.encode(command.rawPassword()));
        userEntity.setRole(command.role());
        userEntity.setEnabled(true);
        userEntity.setTenantId(command.tenantId());
        userEntity.setFirstName(profile.firstName());
        userEntity.setLastName(profile.lastName());
        userEntity.setBirthDate(profile.birthDate());
        userEntity.setLicenseNumber(profile.licenseNumber());
        userEntity.setLicenseTypesJson(DriverProfileJson.writeStringList(profile.licenseTypes()));
        userEntity.setResidentialAddressesJson(DriverProfileJson.writeStringList(profile.residentialAddresses()));
        userEntity.setMobilePhone(profile.mobilePhone());
        userEntity.setLicenseExpiryDate(profile.licenseExpiryDate());

        UserEntity saved = userAdminRepositoryPort.save(userEntity);

        UserAdminAuditLogEntity audit = new UserAdminAuditLogEntity();
        audit.setTenantId(saved.getTenantId());
        audit.setTargetUserId(saved.getId());
        audit.setTargetUserIdValue(saved.getUserId());
        audit.setAdminUserId(adminUserDbId);
        audit.setAdminUserIdValue((adminUserId == null || adminUserId.isBlank()) ? "unknown" : adminUserId);
        audit.setAction("CREATE_USER");
        audit.setChangedFields("userId,email,role,password");
        userAdminAuditLogPort.save(audit);

        return UserAdminMapper.toDto(saved);
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
        String firstName = normalizeRequiredText(firstNameRaw, "Il nome e` obbligatorio");
        String lastName = normalizeRequiredText(lastNameRaw, "Il cognome e` obbligatorio");
        String licenseNumber = normalizeRequiredText(licenseNumberRaw, "Il numero patente e` obbligatorio");
        String mobilePhone = normalizeRequiredText(mobilePhoneRaw, "Il cellulare e` obbligatorio");
        LocalDate birthDate = requireDate(birthDateRaw, "La data di nascita e` obbligatoria");
        LocalDate licenseExpiryDate = requireDate(licenseExpiryDateRaw, "La data di scadenza patente e` obbligatoria");

        if (birthDate.isAfter(LocalDate.now())) {
            throw new UserAdminValidationException("La data di nascita non puo` essere nel futuro");
        }

        if (licenseExpiryDate.isBefore(LocalDate.now().minusYears(20))) {
            throw new UserAdminValidationException("La data di scadenza patente non e` valida");
        }

        if (!MOBILE_PHONE_PATTERN.matcher(mobilePhone).matches()) {
            throw new UserAdminValidationException("Formato cellulare non valido");
        }

        List<String> normalizedLicenseTypes = normalizeNonEmptyList(licenseTypesRaw, "E` obbligatorio almeno un tipo patente");
        List<String> normalizedAddresses = normalizeNonEmptyList(residentialAddressesRaw, "E` obbligatorio almeno un indirizzo di residenza");

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
                "Lo user ID deve essere lungo 3-40 caratteri e contenere solo lettere, numeri, punto, underscore o trattino"
            );
        }
    }

    private void validateEmail(String email) {
        if (!EMAIL_PATTERN.matcher(email).matches()) {
            throw new UserAdminValidationException("Formato email non valido");
        }
    }

    private void validatePassword(String rawPassword) {
        if (rawPassword == null || !PASSWORD_PATTERN.matcher(rawPassword).matches()) {
            throw new UserAdminValidationException(
                "La password deve avere almeno 8 caratteri con maiuscola, minuscola, numero e carattere speciale"
            );
        }
    }

    private void validateRole(UserRole role) {
        if (role == null) {
            throw new UserAdminValidationException("Il ruolo e` obbligatorio");
        }
    }

    private void validateTenantConsistency(UserRole role, Long tenantId) {
        if (role == UserRole.ADMIN) {
            if (tenantId != null) {
                throw new UserAdminValidationException("Un utente ADMIN non puo` essere associato a un tenant");
            }
        } else {
            if (tenantId == null) {
                throw new UserAdminValidationException("Gli utenti GESTIONALE e DRIVER devono essere associati a un tenant");
            }
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
