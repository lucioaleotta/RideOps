package com.rideops.accounting.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.rideops.accounting.adapters.out.persistence.FinancialTransactionEntity;
import com.rideops.accounting.domain.FinancialTransactionCategory;
import com.rideops.accounting.domain.FinancialTransactionType;
import com.rideops.services.application.ServiceClosedEvent;
import com.rideops.services.domain.ServiceAssignmentType;
import com.rideops.services.domain.ServiceType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AutoCreateTransactionFromClosedServiceUseCaseTest {

    @Mock
    private FinancialTransactionRepositoryPort repository;

    private AutoCreateTransactionFromClosedServiceUseCase useCase;

    @BeforeEach
    void setUp() {
        useCase = new AutoCreateTransactionFromClosedServiceUseCase(repository, new AccountingCategoryMapper());
    }

    @Test
    void createsOnlyMarginRevenueForOutsourcedClosure() {
        List<FinancialTransactionEntity> saved = new ArrayList<>();
        when(repository.findBySourceKey("SERVICE_CLOSED:15")).thenReturn(Optional.empty());
        when(repository.save(any(FinancialTransactionEntity.class))).thenAnswer(invocation -> {
            FinancialTransactionEntity entity = invocation.getArgument(0);
            saved.add(entity);
            return entity;
        });

        useCase.execute(closedServiceEvent(15L, ServiceAssignmentType.OUTSOURCED));

        assertEquals(1, saved.size());
        FinancialTransactionEntity movement = saved.get(0);
        assertEquals(FinancialTransactionType.RICAVO, movement.getTransactionType());
        assertEquals(FinancialTransactionCategory.SERVIZIO, movement.getCategory());
        assertEquals(new BigDecimal("40.00"), movement.getAmount());
        assertEquals("SERVICE_CLOSED:15", movement.getSourceKey());
        verify(repository).save(movement);
    }

    @Test
    void usesMarginForIncomingOutsourcedClosureToo() {
        List<FinancialTransactionEntity> saved = new ArrayList<>();
        when(repository.findBySourceKey("SERVICE_CLOSED:16")).thenReturn(Optional.empty());
        when(repository.save(any(FinancialTransactionEntity.class))).thenAnswer(invocation -> {
            FinancialTransactionEntity entity = invocation.getArgument(0);
            saved.add(entity);
            return entity;
        });

        useCase.execute(closedServiceEvent(16L, ServiceAssignmentType.INCOMING_OUTSOURCED));

        assertEquals(1, saved.size());
        assertEquals(new BigDecimal("40.00"), saved.get(0).getAmount());
        assertEquals(FinancialTransactionType.RICAVO, saved.get(0).getTransactionType());
    }

    private ServiceClosedEvent closedServiceEvent(Long serviceId, ServiceAssignmentType assignmentType) {
        return new ServiceClosedEvent(
            1L,
            serviceId,
            null,
            null,
            ServiceType.TRANSFER,
            assignmentType,
            new BigDecimal("120.00"),
            new BigDecimal("40.00"),
            "EUR",
            LocalDate.of(2026, 11, 4),
            "Chiusura manuale servizio affidato #" + serviceId
        );
    }
}
