package com.rideops.identity.application.admin;

public class UserAdminNotFoundException extends RuntimeException {

    public UserAdminNotFoundException(String message) {
        super(message);
    }
}
