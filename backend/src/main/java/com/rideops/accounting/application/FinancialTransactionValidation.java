package com.rideops.accounting.application;

import com.rideops.accounting.adapters.out.persistence.FinancialTransactionEntity;
import com.rideops.accounting.domain.FinancialTransactionCategory;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Locale;
import org.springframework.stereotype.Component;

@Component
public class FinancialTransactionValidation {

    public void validate(FinancialTransactionCommand command) {
        if (command.transactionType() == null) {
            throw new FinancialValidationException("Transaction type is required");
        }
        if (command.category() == null) {
            throw new FinancialValidationException("Category is required");
        }
        if (!FinancialTransactionCategory.isCompatible(command.transactionType(), command.category())) {
            throw new FinancialValidationException("Category is not compatible with transaction type");
        }
        if (command.description() == null || command.description().trim().isEmpty()) {
            throw new FinancialValidationException("Description is required");
        }
        if (command.amount() == null || command.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new FinancialValidationException("Amount must be greater than zero");
        }
        if (command.currency() == null || command.currency().trim().length() != 3) {
            throw new FinancialValidationException("Currency must be a 3-letter code");
        }
        if (command.transactionDate() == null) {
            throw new FinancialValidationException("Transaction date is required");
        }
        if (command.transactionDate().isAfter(LocalDate.now().plusDays(1))) {
            throw new FinancialValidationException("Transaction date cannot be in the future");
        }
    }

    public void applyOnEntity(FinancialTransactionEntity entity, FinancialTransactionCommand command) {
        entity.setTransactionType(command.transactionType());
        entity.setCategory(command.category());
        entity.setDescription(command.description().trim());
        entity.setAmount(command.amount().setScale(2, java.math.RoundingMode.HALF_UP));
        entity.setCurrency(command.currency().trim().toUpperCase(Locale.ROOT));
        entity.setTransactionDate(command.transactionDate());
        entity.setServiceId(command.serviceId());
        entity.setVehicleId(command.vehicleId());
        entity.setDriverId(command.driverId());
        entity.setDeadlineOccurrenceId(command.deadlineOccurrenceId());

        String notes = command.notes() == null ? null : command.notes().trim();
        entity.setNotes((notes == null || notes.isEmpty()) ? null : notes);
    }
}
