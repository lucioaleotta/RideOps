package com.rideops.accounting.application;

import java.math.BigDecimal;

public record FinanceKpiSummaryDto(
    long totalServices,
    BigDecimal totalRevenue,
    BigDecimal totalCosts,
    BigDecimal gross,
    BigDecimal net,
    BigDecimal averageRevenuePerService,
    BigDecimal averageCostPerService
) {
}
