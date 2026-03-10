package com.rideops.accounting.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.rideops.accounting.adapters.out.persistence.FinancialTransactionEntity;
import com.rideops.accounting.domain.FinancialTransactionCategory;
import com.rideops.accounting.domain.FinancialTransactionType;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CreateFinancialTransactionUseCaseTest {

    @Mock
    private FinancialTransactionRepositoryPort repository;

    private CreateFinancialTransactionUseCase useCase;

    @BeforeEach
    void setUp() {
        useCase = new CreateFinancialTransactionUseCase(repository, new FinancialTransactionValidation());
    }

    @Test
    void createValidRevenueTransaction() {
        FinancialTransactionEntity saved = new FinancialTransactionEntity();
        saved.setTransactionType(FinancialTransactionType.RICAVO);
        saved.setCategory(FinancialTransactionCategory.SERVIZIO);
        saved.setDescription("Incasso servizio #10");
        saved.setAmount(BigDecimal.valueOf(120.50));
        saved.setCurrency("EUR");
        saved.setTransactionDate(LocalDate.of(2026, 3, 10));

        when(repository.save(any(FinancialTransactionEntity.class))).thenReturn(saved);

        FinancialTransactionDto dto = useCase.execute(new FinancialTransactionCommand(
            FinancialTransactionType.RICAVO,
            FinancialTransactionCategory.SERVIZIO,
            "Incasso servizio #10",
            BigDecimal.valueOf(120.5),
            "EUR",
            LocalDate.of(2026, 3, 10),
            10L,
            5L,
            2L,
            null,
            null
        ));

        assertEquals(FinancialTransactionType.RICAVO, dto.transactionType());
        assertEquals(FinancialTransactionCategory.SERVIZIO, dto.category());
        assertEquals("EUR", dto.currency());
    }

    @Test
    void rejectIncompatibleCategoryType() {
        assertThrows(FinancialValidationException.class, () -> useCase.execute(new FinancialTransactionCommand(
            FinancialTransactionType.RICAVO,
            FinancialTransactionCategory.CARBURANTE,
            "Incompatibile",
            BigDecimal.valueOf(10),
            "EUR",
            LocalDate.of(2026, 3, 10),
            null,
            null,
            null,
            null,
            null
        )));
    }
}
