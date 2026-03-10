package com.rideops.accounting.application;

import com.rideops.accounting.domain.FinancialTransactionType;
import org.springframework.stereotype.Service;

@Service
public class GenerateFinanceDashboardUseCase {

    private final FinanceSummarySupport support;
    private final GenerateMonthlySummaryUseCase monthlySummaryUseCase;
    private final GenerateCategorySummaryUseCase categorySummaryUseCase;
    private final GenerateComparisonBetweenYearsUseCase comparisonUseCase;

    public GenerateFinanceDashboardUseCase(FinanceSummarySupport support,
                                           GenerateMonthlySummaryUseCase monthlySummaryUseCase,
                                           GenerateCategorySummaryUseCase categorySummaryUseCase,
                                           GenerateComparisonBetweenYearsUseCase comparisonUseCase) {
        this.support = support;
        this.monthlySummaryUseCase = monthlySummaryUseCase;
        this.categorySummaryUseCase = categorySummaryUseCase;
        this.comparisonUseCase = comparisonUseCase;
    }

    public FinanceDashboardDto execute(int year, int month) {
        FinanceTimeRange monthRange = FinanceTimeRange.forMonth(year, month);
        FinanceTimeRange yearRange = FinanceTimeRange.forYear(year);

        return new FinanceDashboardDto(
            year,
            month,
            support.buildKpis(monthRange.fromDate(), monthRange.toExclusiveDate()),
            support.buildKpis(yearRange.fromDate(), yearRange.toExclusiveDate()),
            monthlySummaryUseCase.execute(year),
            categorySummaryUseCase.execute(year, month, FinancialTransactionType.COSTO),
            comparisonUseCase.execute(year, year - 1)
        );
    }
}
