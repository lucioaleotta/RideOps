package com.rideops.identity.application.admin;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.List;

public record UserSummaryDto(
    Long id,
    String userId,
    String email,
    String role,
    boolean enabled,
    LocalDateTime createdAt,
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
