package com.rideops.accounting.application;

import com.rideops.accounting.domain.FinancialTransactionCategory;
import com.rideops.fleet.domain.DeadlineType;
import com.rideops.services.domain.ServiceType;
import org.springframework.stereotype.Component;

@Component
public class AccountingCategoryMapper {

    public FinancialTransactionCategory serviceRevenueCategory(ServiceType type) {
        return type == ServiceType.TOUR
            ? FinancialTransactionCategory.SERVIZIO_ESTERNO
            : FinancialTransactionCategory.SERVIZIO;
    }

    public FinancialTransactionCategory deadlineCostCategory(DeadlineType type) {
        return switch (type) {
            case BOLLO -> FinancialTransactionCategory.BOLLO;
            case ASSICURAZIONE -> FinancialTransactionCategory.ASSICURAZIONE;
            case REVISIONE -> FinancialTransactionCategory.REVISIONE;
            case TAGLIANDO -> FinancialTransactionCategory.TAGLIANDO;
            case ALTRO -> FinancialTransactionCategory.MANUTENZIONE_STRAORDINARIA;
        };
    }
}
