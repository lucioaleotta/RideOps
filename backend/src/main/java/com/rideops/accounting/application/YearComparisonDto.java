package com.rideops.accounting.application;

import java.util.List;

public record YearComparisonDto(
    int year,
    int compareWith,
    List<MonthlyFinancePointDto> currentYear,
    List<MonthlyFinancePointDto> comparedYear
) {
}
