package com.rideops.accounting.application;

import org.springframework.stereotype.Service;

@Service
public class GenerateServiceStatisticsUseCase {

    private final FinanceSummarySupport support;

    public GenerateServiceStatisticsUseCase(FinanceSummarySupport support) {
        this.support = support;
    }

    public FinanceKpiSummaryDto execute(int year, Integer month) {
        FinanceTimeRange range = month == null
            ? FinanceTimeRange.forYear(year)
            : FinanceTimeRange.forMonth(year, month);

        return support.buildKpis(range.fromDate(), range.toExclusiveDate());
    }
}
