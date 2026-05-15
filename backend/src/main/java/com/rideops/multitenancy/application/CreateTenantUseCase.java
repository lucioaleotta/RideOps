package com.rideops.multitenancy.application;

import com.rideops.identity.application.BrevoEmailClient;
import com.rideops.identity.application.BrevoTemplates;
import com.rideops.multitenancy.SubscriptionPlan;
import com.rideops.multitenancy.SubscriptionStatus;
import com.rideops.multitenancy.TenantEntity;
import com.rideops.multitenancy.TenantOperationalStatus;
import java.security.SecureRandom;
import java.util.Locale;
import java.util.Map;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class CreateTenantUseCase {

    private static final Pattern EMAIL_PATTERN =
        Pattern.compile("^[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}$", Pattern.CASE_INSENSITIVE);

    private static final SecureRandom RANDOM = new SecureRandom();

    private final TenantManagementRepositoryPort tenantManagementRepositoryPort;
    private final TenantAdminProvisioningPort tenantAdminProvisioningPort;
    private final BrevoEmailClient brevoEmailClient;
    private final String loginUrl;

    public CreateTenantUseCase(TenantManagementRepositoryPort tenantManagementRepositoryPort,
                               TenantAdminProvisioningPort tenantAdminProvisioningPort,
                               BrevoEmailClient brevoEmailClient,
                               @Value("${rideops.login-url:https://rideops.it/login}") String loginUrl) {
        this.tenantManagementRepositoryPort = tenantManagementRepositoryPort;
        this.tenantAdminProvisioningPort = tenantAdminProvisioningPort;
        this.brevoEmailClient = brevoEmailClient;
        this.loginUrl = loginUrl;
    }

    public TenantProvisioningResultDto execute(CreateTenantCommand command) {
        if (command == null) {
            throw new TenantValidationException("Payload tenant mancante");
        }

        String businessName = requireText(command.businessName(), "Ragione sociale obbligatoria");
        String contactEmail = normalizeEmail(command.contactEmail());
        validateEmail(contactEmail, "Email contatto non valida");

        if (tenantManagementRepositoryPort.existsByBusinessNameIgnoreCase(businessName)) {
            throw new TenantValidationException("Esiste gia` un tenant con la stessa ragione sociale");
        }

        if (tenantManagementRepositoryPort.existsByContactEmailIgnoreCase(contactEmail)) {
            throw new TenantValidationException("Esiste gia` un tenant con la stessa email contatto");
        }

        TenantEntity tenant = new TenantEntity();
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
        tenant.setStatus(TenantOperationalStatus.ACTIVE);
        tenant.setSubscriptionStatus(command.subscriptionStatus() == null ? SubscriptionStatus.TRIAL : command.subscriptionStatus());
        tenant.setSubscriptionPlan(command.subscriptionPlan() == null ? SubscriptionPlan.STARTER : command.subscriptionPlan());
        tenant.setLogoUrl(cleanNullable(command.logoUrl()));
        tenant.setPrimaryColor(cleanNullable(command.primaryColor()));
        tenant.setSecondaryColor(cleanNullable(command.secondaryColor()));

        TenantEntity savedTenant = tenantManagementRepositoryPort.save(tenant);

        String adminUserId = buildUniqueAdminUserId(savedTenant.getBusinessName());
        String adminEmail = buildUniqueAdminEmail(savedTenant.getContactEmail(), savedTenant.getId());
        String adminPassword = generateTemporaryPassword();
        String[] names = splitName(savedTenant.getContactPerson());

        tenantAdminProvisioningPort.createDefaultAdminUser(
            savedTenant.getId(),
            adminUserId,
            adminEmail,
            adminPassword,
            names[0],
            names[1]
        );

        brevoEmailClient.sendTemplateEmail(
            savedTenant.getId(),
            adminEmail,
            names[0] + " " + names[1],
            BrevoTemplates.BENVENUTO,
            Map.of(
                "firstName", defaultIfBlank(names[0], "Tenant"),
                "lastName", defaultIfBlank(names[1], "Admin"),
                "username", adminUserId,
                "companyName", savedTenant.getBusinessName(),
                "email", adminEmail,
                "phone", defaultIfBlank(savedTenant.getContactPhone(), ""),
                "loginUrl", defaultIfBlank(loginUrl, "https://rideops.it/login")
            )
        );

        return new TenantProvisioningResultDto(
            TenantMapper.toDto(savedTenant),
            adminUserId,
            adminEmail,
            adminPassword
        );
    }

    private String buildUniqueAdminUserId(String businessName) {
        String normalized = businessName.toLowerCase(Locale.ROOT)
            .replaceAll("[^a-z0-9]+", "-")
            .replaceAll("^-+|-+$", "");
        if (normalized.isBlank()) {
            normalized = "tenant";
        }

        String base = "admin-" + normalized;
        String candidate = base;
        int suffix = 1;
        while (tenantAdminProvisioningPort.existsByUserIdIgnoreCase(candidate)) {
            candidate = base + "-" + suffix;
            suffix++;
        }
        return candidate;
    }

    private String buildUniqueAdminEmail(String contactEmail, Long tenantId) {
        if (!tenantAdminProvisioningPort.existsByEmailIgnoreCase(contactEmail)) {
            return contactEmail;
        }

        int at = contactEmail.indexOf('@');
        String local = at > 0 ? contactEmail.substring(0, at) : "admin";
        String domain = at > 0 ? contactEmail.substring(at + 1) : "example.com";

        String base = local + "+tenant" + tenantId;
        String candidate = base + "@" + domain;
        int suffix = 1;
        while (tenantAdminProvisioningPort.existsByEmailIgnoreCase(candidate)) {
            candidate = base + "-" + suffix + "@" + domain;
            suffix++;
        }
        return candidate;
    }

    private String generateTemporaryPassword() {
        String alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*_-";
        StringBuilder builder = new StringBuilder("Tmp!");
        for (int i = 0; i < 12; i++) {
            builder.append(alphabet.charAt(RANDOM.nextInt(alphabet.length())));
        }
        return builder.toString();
    }

    private String[] splitName(String fullName) {
        if (fullName == null || fullName.isBlank()) {
            return new String[] {"Tenant", "Admin"};
        }
        String normalized = fullName.trim();
        int firstSpace = normalized.indexOf(' ');
        if (firstSpace < 0) {
            return new String[] {normalized, "Admin"};
        }
        String firstName = normalized.substring(0, firstSpace).trim();
        String lastName = normalized.substring(firstSpace + 1).trim();
        if (lastName.isEmpty()) {
            lastName = "Admin";
        }
        return new String[] {firstName, lastName};
    }

    private String requireText(String value, String message) {
        if (value == null || value.trim().isEmpty()) {
            throw new TenantValidationException(message);
        }
        return value.trim();
    }

    private String cleanNullable(String value) {
        if (value == null) {
            return null;
        }
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
        if (cleaned == null) {
            return null;
        }
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
