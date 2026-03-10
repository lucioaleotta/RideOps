package com.rideops.accounting.application;

import com.rideops.accounting.adapters.out.persistence.FinanceTypeTotalProjection;
import com.rideops.accounting.adapters.out.persistence.FinanceYearMonthTotalProjection;
import com.rideops.accounting.domain.FinancialTransactionType;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class FinanceSummarySupport {

    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP);

    private final FinancialTransactionRepositoryPort repository;

    public FinanceSummarySupport(FinancialTransactionRepositoryPort repository) {
        this.repository = repository;
    }

    public FinanceKpiSummaryDto buildKpis(LocalDate fromDate, LocalDate toDateExclusive) {
        List<FinanceTypeTotalProjection> totals = repository.summarizeByTypeInRange(fromDate, toDateExclusive);
        BigDecimal revenue = totalByType(totals, FinancialTransactionType.RICAVO);
        BigDecimal costs = totalByType(totals, FinancialTransactionType.COSTO);
        BigDecimal net = revenue.subtract(costs).setScale(2, RoundingMode.HALF_UP);

        long totalServices = repository.countDistinctServicesWithTransactions(fromDate, toDateExclusive);
        BigDecimal avgRevenue = average(revenue, totalServices);
        BigDecimal avgCost = average(costs, totalServices);

        return new FinanceKpiSummaryDto(totalServices, revenue, costs, revenue, net, avgRevenue, avgCost);
    }

    public List<MonthlyFinancePointDto> buildMonthlySeries(int year) {
        List<FinanceYearMonthTotalProjection> points = repository.summarizeMonthlyByYear(year);
        List<MonthlyFinancePointDto> result = new ArrayList<>();

        for (int month = 1; month <= 12; month += 1) {
            BigDecimal revenue = ZERO;
            BigDecimal costs = ZERO;

            for (FinanceYearMonthTotalProjection point : points) {
                if (point.getMonth() == null || point.getMonth() != month) {
                    continue;
                }
                if (point.getTransactionType() == FinancialTransactionType.RICAVO) {
                    revenue = safe(point.getTotalAmount());
                } else if (point.getTransactionType() == FinancialTransactionType.COSTO) {
                    costs = safe(point.getTotalAmount());
                }
            }

            result.add(new MonthlyFinancePointDto(month, revenue, costs, revenue, revenue.subtract(costs).setScale(2, RoundingMode.HALF_UP)));
        }

        return result;
    }

    private BigDecimal totalByType(List<FinanceTypeTotalProjection> totals, FinancialTransactionType type) {
        return totals.stream()
            .filter(item -> item.getTransactionType() == type)
            .map(FinanceTypeTotalProjection::getTotalAmount)
            .filter(amount -> amount != null)
            .findFirst()
            .map(this::safe)
            .orElse(ZERO);
    }

    private BigDecimal average(BigDecimal amount, long count) {
        if (count <= 0) {
            return ZERO;
        }
        return amount.divide(BigDecimal.valueOf(count), 2, RoundingMode.HALF_UP);
    }

    private BigDecimal safe(BigDecimal value) {
        return value == null ? ZERO : value.setScale(2, RoundingMode.HALF_UP);
    }
}
