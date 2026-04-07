package com.rideops.multitenancy.application;

public interface TenantAdminProvisioningPort {

    boolean existsByUserIdIgnoreCase(String userId);

    boolean existsByEmailIgnoreCase(String email);

    void createDefaultAdminUser(Long tenantId,
                                String userId,
                                String email,
                                String rawPassword,
                                String firstName,
                                String lastName);
}
