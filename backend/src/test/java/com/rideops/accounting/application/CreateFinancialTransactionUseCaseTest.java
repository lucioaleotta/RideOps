package com.rideops.accounting.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

import com.rideops.accounting.adapters.out.persistence.FinancialTransactionEntity;
import com.rideops.accounting.domain.FinancialTransactionCategory;
import com.rideops.accounting.domain.FinancialTransactionType;
import com.rideops.identity.adapters.out.UserEntity;
import com.rideops.identity.application.IdentityUserDetails;
import com.rideops.identity.domain.UserRole;
import com.rideops.multitenancy.TenantContext;
import java.math.BigDecimal;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class CreateFinancialTransactionUseCaseTest {

    @Mock
    private FinancialTransactionRepositoryPort repository;

    private CreateFinancialTransactionUseCase useCase;

    @BeforeEach
    void setUp() {
        applyTenantAuthentication(1L);
        useCase = new CreateFinancialTransactionUseCase(repository, new FinancialTransactionValidation(), new TenantContext());
    }

    private void applyTenantAuthentication(Long tenantId) {
        UserEntity user = new UserEntity();
        user.setUserId("tester");
        user.setEmail("tester@rideops.local");
        user.setPasswordHash("hash");
        user.setRole(UserRole.ADMIN);
        user.setEnabled(true);
        user.setTenantId(tenantId);

        IdentityUserDetails principal = new IdentityUserDetails(user);
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities())
        );
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
