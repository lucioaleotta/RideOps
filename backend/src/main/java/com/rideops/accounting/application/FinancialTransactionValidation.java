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
            throw new FinancialValidationException("Il tipo transazione e` obbligatorio");
        }
        if (command.category() == null) {
            throw new FinancialValidationException("La categoria e` obbligatoria");
        }
        if (!FinancialTransactionCategory.isCompatible(command.transactionType(), command.category())) {
            throw new FinancialValidationException("La categoria non e` compatibile con il tipo transazione");
        }
        if (command.description() == null || command.description().trim().isEmpty()) {
            throw new FinancialValidationException("La descrizione e` obbligatoria");
        }
        if (command.amount() == null || command.amount().compareTo(BigDecimal.ZERO) <= 0) {
            throw new FinancialValidationException("L'importo deve essere maggiore di zero");
        }
        if (command.currency() == null || command.currency().trim().length() != 3) {
            throw new FinancialValidationException("La valuta deve essere un codice di 3 lettere");
        }
        if (command.transactionDate() == null) {
            throw new FinancialValidationException("La data transazione e` obbligatoria");
        }
        if (command.transactionDate().isAfter(LocalDate.now().plusDays(1))) {
            throw new FinancialValidationException("La data transazione non puo` essere nel futuro");
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
