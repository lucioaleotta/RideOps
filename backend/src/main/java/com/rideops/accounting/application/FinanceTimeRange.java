package com.rideops.accounting.application;

import java.time.LocalDate;

public record FinanceTimeRange(LocalDate fromDate, LocalDate toExclusiveDate) {

    public static FinanceTimeRange forMonth(int year, int month) {
        LocalDate from = LocalDate.of(year, month, 1);
        return new FinanceTimeRange(from, from.plusMonths(1));
    }

    public static FinanceTimeRange forYear(int year) {
        LocalDate from = LocalDate.of(year, 1, 1);
        return new FinanceTimeRange(from, from.plusYears(1));
    }
}
