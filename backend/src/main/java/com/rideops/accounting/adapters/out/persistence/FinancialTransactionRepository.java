package com.rideops.accounting.adapters.out.persistence;

import com.rideops.accounting.domain.FinancialTransactionType;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FinancialTransactionRepository
    extends JpaRepository<FinancialTransactionEntity, Long>, JpaSpecificationExecutor<FinancialTransactionEntity> {

    Optional<FinancialTransactionEntity> findBySourceKey(String sourceKey);

    @Query("""
        select t.transactionType as transactionType, coalesce(sum(t.amount), 0) as totalAmount
        from FinancialTransactionEntity t
        where t.voided = false
          and t.transactionDate >= :fromDate
          and t.transactionDate < :toDate
        group by t.transactionType
        """)
    List<FinanceTypeTotalProjection> summarizeByTypeInRange(@Param("fromDate") LocalDate fromDate,
                                                            @Param("toDate") LocalDate toDate);

    @Query("""
        select
          year(t.transactionDate) as year,
          month(t.transactionDate) as month,
          t.transactionType as transactionType,
          coalesce(sum(t.amount), 0) as totalAmount
        from FinancialTransactionEntity t
        where t.voided = false
          and year(t.transactionDate) = :year
        group by year(t.transactionDate),
                 month(t.transactionDate),
                 t.transactionType
        order by month(t.transactionDate)
        """)
    List<FinanceYearMonthTotalProjection> summarizeMonthlyByYear(@Param("year") int year);

    @Query("""
        select
          year(t.transactionDate) as year,
          t.transactionType as transactionType,
          coalesce(sum(t.amount), 0) as totalAmount
        from FinancialTransactionEntity t
        where t.voided = false
        group by year(t.transactionDate), t.transactionType
        order by year(t.transactionDate)
        """)
    List<FinanceYearTotalProjection> summarizeYearly();

    @Query("""
        select t.category as category, coalesce(sum(t.amount), 0) as totalAmount
        from FinancialTransactionEntity t
        where t.voided = false
          and t.transactionType = :type
          and t.transactionDate >= :fromDate
          and t.transactionDate < :toDate
        group by t.category
        order by t.category
        """)
    List<FinanceCategoryTotalProjection> summarizeByCategoryInRange(@Param("type") FinancialTransactionType type,
                                                                    @Param("fromDate") LocalDate fromDate,
                                                                    @Param("toDate") LocalDate toDate);

    long countByVoidedFalseAndServiceIdIsNotNullAndTransactionDateGreaterThanEqualAndTransactionDateLessThan(
        LocalDate fromDate,
        LocalDate toDate
    );

    @Query("""
      select count(distinct t.serviceId)
      from FinancialTransactionEntity t
      where t.voided = false
        and t.serviceId is not null
        and t.transactionDate >= :fromDate
        and t.transactionDate < :toDate
      """)
    long countDistinctServicesWithTransactions(@Param("fromDate") LocalDate fromDate,
                           @Param("toDate") LocalDate toDate);

    List<FinancialTransactionEntity> findAllByTransactionDateGreaterThanEqualAndTransactionDateLessThanAndVoidedFalse(
        LocalDate fromDate,
        LocalDate toDate,
        Sort sort
    );

    List<FinancialTransactionEntity> findAllByVoidedFalse(Sort sort);

}
