package com.rideops.accounting.application;

import java.util.List;

public record FinanceDashboardDto(
    int year,
    int month,
    FinanceKpiSummaryDto monthKpis,
    FinanceKpiSummaryDto yearKpis,
    List<MonthlyFinancePointDto> monthlySeries,
    List<CategorySummaryItemDto> categoryCosts,
    YearComparisonDto comparison
) {
}
