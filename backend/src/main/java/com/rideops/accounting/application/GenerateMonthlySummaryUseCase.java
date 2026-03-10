package com.rideops.accounting.application;

import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class GenerateMonthlySummaryUseCase {

    private final FinanceSummarySupport support;

    public GenerateMonthlySummaryUseCase(FinanceSummarySupport support) {
        this.support = support;
    }

    public List<MonthlyFinancePointDto> execute(int year) {
        return support.buildMonthlySeries(year);
    }
}
