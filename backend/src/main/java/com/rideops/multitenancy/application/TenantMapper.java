package com.rideops.multitenancy.application;

import com.rideops.multitenancy.TenantEntity;

public final class TenantMapper {

    private TenantMapper() {
    }

    public static TenantDto toDto(TenantEntity entity) {
        return new TenantDto(
            entity.getId(),
            entity.getBusinessName(),
            entity.getVatNumber(),
            entity.getTaxCode(),
            entity.getSdiCode(),
            entity.getPecEmail(),
            entity.getContactEmail(),
            entity.getContactPhone(),
            entity.getContactPerson(),
            entity.getAddressLine(),
            entity.getAddressCity(),
            entity.getAddressProvince(),
            entity.getAddressPostalCode(),
            entity.getAddressCountry(),
            entity.getTimezone(),
            entity.getCurrency(),
            entity.getLanguage(),
            entity.isNotifyEmailEnabled(),
            entity.isNotifySmsEnabled(),
            entity.isNotifyPushEnabled(),
            entity.getStatus(),
            entity.getSubscriptionStatus(),
            entity.getSubscriptionPlan(),
            entity.getLogoUrl(),
            entity.getPrimaryColor(),
            entity.getSecondaryColor(),
            entity.getCreatedAt()
        );
    }
}
