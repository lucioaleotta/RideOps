package com.rideops.accounting.application;

import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ListFinancialTransactionsUseCase {

    private final FinancialTransactionRepositoryPort repository;

    public ListFinancialTransactionsUseCase(FinancialTransactionRepositoryPort repository) {
        this.repository = repository;
    }

    public List<FinancialTransactionDto> execute(FinancialTransactionFilter filter) {
        return repository.findByFilter(filter).stream()
            .map(FinancialTransactionMapper::toDto)
            .toList();
    }
}
