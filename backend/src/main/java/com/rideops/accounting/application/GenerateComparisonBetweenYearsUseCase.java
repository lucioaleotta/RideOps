package com.rideops.accounting.application;

import org.springframework.stereotype.Service;

@Service
public class GenerateComparisonBetweenYearsUseCase {

    private final GenerateMonthlySummaryUseCase generateMonthlySummaryUseCase;

    public GenerateComparisonBetweenYearsUseCase(GenerateMonthlySummaryUseCase generateMonthlySummaryUseCase) {
        this.generateMonthlySummaryUseCase = generateMonthlySummaryUseCase;
    }

    public YearComparisonDto execute(int year, int compareWith) {
        return new YearComparisonDto(
            year,
            compareWith,
            generateMonthlySummaryUseCase.execute(year),
            generateMonthlySummaryUseCase.execute(compareWith)
        );
    }
}
