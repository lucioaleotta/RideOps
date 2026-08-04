package com.rideops.services.application;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PartnerPaymentReportRowDto(
    Long partnerId,
    String partnerName,
    Long serviceId,
    String rideCode,
    LocalDateTime serviceDate,
    BigDecimal amount,
    String driverName,
    String vehiclePlate,
    String serviceType,
    String pickupLocation,
    String destination,
    String route
) {
}
