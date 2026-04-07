package com.rideops.multitenancy.application;

public class TenantNotFoundException extends RuntimeException {

    public TenantNotFoundException(Long tenantId) {
        super("Tenant non trovato: id=" + tenantId);
    }
}
