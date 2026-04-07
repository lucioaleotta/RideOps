package com.rideops.multitenancy.application;

import com.rideops.multitenancy.SubscriptionPlan;
import com.rideops.multitenancy.SubscriptionStatus;
import com.rideops.multitenancy.TenantOperationalStatus;
import java.time.LocalDateTime;

public record TenantDto(
    Long id,
    String businessName,
    String vatNumber,
    String taxCode,
    String sdiCode,
    String pecEmail,
    String contactEmail,
    String contactPhone,
    String contactPerson,
    String addressLine,
    String addressCity,
    String addressProvince,
    String addressPostalCode,
    String addressCountry,
    String timezone,
    String currency,
    String language,
    boolean notifyEmailEnabled,
    boolean notifySmsEnabled,
    boolean notifyPushEnabled,
    TenantOperationalStatus status,
    SubscriptionStatus subscriptionStatus,
    SubscriptionPlan subscriptionPlan,
    String logoUrl,
    String primaryColor,
    String secondaryColor,
    LocalDateTime createdAt
) {
}
