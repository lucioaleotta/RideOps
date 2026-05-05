package com.rideops.identity.domain;

import java.util.List;

public enum UserRole {
    ADMIN,
    GESTIONALE,
    DRIVER,
    DRIVER_FREELANCER;

    public boolean isDriverRole() {
        return this == DRIVER || this == DRIVER_FREELANCER;
    }

    public static List<UserRole> driverRoles() {
        return List.of(DRIVER, DRIVER_FREELANCER);
    }
}
