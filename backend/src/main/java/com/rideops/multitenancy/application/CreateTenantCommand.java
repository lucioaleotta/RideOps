package com.rideops.multitenancy.application;

import com.rideops.multitenancy.SubscriptionPlan;
import com.rideops.multitenancy.SubscriptionStatus;

public record CreateTenantCommand(
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
    Boolean notifyEmailEnabled,
    Boolean notifySmsEnabled,
    Boolean notifyPushEnabled,
    SubscriptionStatus subscriptionStatus,
    SubscriptionPlan subscriptionPlan,
    String logoUrl,
    String primaryColor,
    String secondaryColor
) {
}
