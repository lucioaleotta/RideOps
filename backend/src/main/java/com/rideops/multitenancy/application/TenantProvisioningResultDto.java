package com.rideops.multitenancy.application;

public record TenantProvisioningResultDto(
    TenantDto tenant,
    String provisionedAdminUserId,
    String provisionedAdminEmail,
    String temporaryAdminPassword
) {
}
