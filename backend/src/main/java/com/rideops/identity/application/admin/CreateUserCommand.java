package com.rideops.identity.application.admin;

import com.rideops.identity.domain.UserRole;
import java.time.LocalDate;
import java.util.List;

public record CreateUserCommand(
    String userId,
    String email,
    String rawPassword,
    UserRole role,
    String firstName,
    String lastName,
    LocalDate birthDate,
    String licenseNumber,
    List<String> licenseTypes,
    List<String> residentialAddresses,
    String mobilePhone,
    LocalDate licenseExpiryDate
) {
}
