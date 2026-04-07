package com.rideops.multitenancy.application;

import com.rideops.multitenancy.TenantEntity;
import java.util.Locale;
import java.util.regex.Pattern;
import org.springframework.stereotype.Service;

@Service
public class UpdateTenantUseCase {

    private static final Pattern EMAIL_PATTERN =
        Pattern.compile("^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$", Pattern.CASE_INSENSITIVE);

    private final TenantManagementRepositoryPort tenantManagementRepositoryPort;

    public UpdateTenantUseCase(TenantManagementRepositoryPort tenantManagementRepositoryPort) {
        this.tenantManagementRepositoryPort = tenantManagementRepositoryPort;
    }

    public TenantDto execute(UpdateTenantCommand command) {
        if (command == null || command.id() == null) {
            throw new TenantValidationException("ID tenant mancante");
        }

        TenantEntity tenant = tenantManagementRepositoryPort
            .findById(command.id())
            .orElseThrow(() -> new TenantNotFoundException(command.id()));

        String businessName = requireText(command.businessName(), "Ragione sociale obbligatoria");
        String contactEmail = normalizeEmail(command.contactEmail());

        if (tenantManagementRepositoryPort.existsByBusinessNameIgnoreCaseAndIdNot(businessName, command.id())) {
            throw new TenantValidationException("Esiste gia` un tenant con la stessa ragione sociale");
        }

        if (tenantManagementRepositoryPort.existsByContactEmailIgnoreCaseAndIdNot(contactEmail, command.id())) {
            throw new TenantValidationException("Esiste gia` un tenant con la stessa email contatto");
        }

        tenant.setBusinessName(businessName);
        tenant.setVatNumber(cleanNullable(command.vatNumber()));
        tenant.setTaxCode(cleanNullable(command.taxCode()));
        tenant.setSdiCode(cleanNullable(command.sdiCode()));
        tenant.setPecEmail(normalizeNullableEmail(command.pecEmail(), "PEC non valida"));
        tenant.setContactEmail(contactEmail);
        tenant.setContactPhone(cleanNullable(command.contactPhone()));
        tenant.setContactPerson(cleanNullable(command.contactPerson()));
        tenant.setAddressLine(cleanNullable(command.addressLine()));
        tenant.setAddressCity(cleanNullable(command.addressCity()));
        tenant.setAddressProvince(cleanNullable(command.addressProvince()));
        tenant.setAddressPostalCode(cleanNullable(command.addressPostalCode()));
        tenant.setAddressCountry(cleanNullable(command.addressCountry()));
        tenant.setTimezone(defaultIfBlank(command.timezone(), "Europe/Rome"));
        tenant.setCurrency(defaultIfBlank(command.currency(), "EUR").toUpperCase(Locale.ROOT));
        tenant.setLanguage(defaultIfBlank(command.language(), "it").toLowerCase(Locale.ROOT));
        tenant.setNotifyEmailEnabled(command.notifyEmailEnabled() == null ? true : command.notifyEmailEnabled());
        tenant.setNotifySmsEnabled(command.notifySmsEnabled() != null && command.notifySmsEnabled());
        tenant.setNotifyPushEnabled(command.notifyPushEnabled() != null && command.notifyPushEnabled());
        if (command.subscriptionStatus() != null) {
            tenant.setSubscriptionStatus(command.subscriptionStatus());
        }
        if (command.subscriptionPlan() != null) {
            tenant.setSubscriptionPlan(command.subscriptionPlan());
        }
        tenant.setLogoUrl(cleanNullable(command.logoUrl()));
        tenant.setPrimaryColor(cleanNullable(command.primaryColor()));
        tenant.setSecondaryColor(cleanNullable(command.secondaryColor()));

        return TenantMapper.toDto(tenantManagementRepositoryPort.save(tenant));
    }

    private String requireText(String value, String message) {
        if (value == null || value.trim().isEmpty()) {
            throw new TenantValidationException(message);
        }
        return value.trim();
    }

    private String cleanNullable(String value) {
        if (value == null) return null;
        String cleaned = value.trim();
        return cleaned.isEmpty() ? null : cleaned;
    }

    private String normalizeEmail(String value) {
        String email = requireText(value, "Email contatto obbligatoria").toLowerCase(Locale.ROOT);
        validateEmail(email, "Email contatto non valida");
        return email;
    }

    private String normalizeNullableEmail(String value, String message) {
        String cleaned = cleanNullable(value);
        if (cleaned == null) return null;
        String email = cleaned.toLowerCase(Locale.ROOT);
        validateEmail(email, message);
        return email;
    }

    private void validateEmail(String value, String message) {
        if (!EMAIL_PATTERN.matcher(value).matches()) {
            throw new TenantValidationException(message);
        }
    }

    private String defaultIfBlank(String value, String defaultValue) {
        String cleaned = cleanNullable(value);
        return cleaned == null ? defaultValue : cleaned;
    }
}
