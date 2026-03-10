package com.rideops.accounting.application;

import com.rideops.accounting.adapters.out.persistence.FinanceCategoryTotalProjection;
import com.rideops.accounting.adapters.out.persistence.FinanceTypeTotalProjection;
import com.rideops.accounting.adapters.out.persistence.FinanceYearMonthTotalProjection;
import com.rideops.accounting.adapters.out.persistence.FinanceYearTotalProjection;
import com.rideops.accounting.adapters.out.persistence.FinancialTransactionEntity;
import com.rideops.accounting.domain.FinancialTransactionType;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface FinancialTransactionRepositoryPort {

    FinancialTransactionEntity save(FinancialTransactionEntity entity);

    Optional<FinancialTransactionEntity> findById(Long id);

    Optional<FinancialTransactionEntity> findBySourceKey(String sourceKey);

    List<FinancialTransactionEntity> findByFilter(FinancialTransactionFilter filter);

    List<FinanceTypeTotalProjection> summarizeByTypeInRange(LocalDate fromDate, LocalDate toDate);

    List<FinanceYearMonthTotalProjection> summarizeMonthlyByYear(int year);

    List<FinanceYearTotalProjection> summarizeYearly();

    List<FinanceCategoryTotalProjection> summarizeByCategoryInRange(FinancialTransactionType type,
                                                                    LocalDate fromDate,
                                                                    LocalDate toDate);

    long countDistinctServicesWithTransactions(LocalDate fromDate, LocalDate toDate);
}
