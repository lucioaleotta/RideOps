package com.rideops.services.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

import com.rideops.services.domain.ServiceAssignmentType;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;

class ServiceValidationSupportTest {

    @Test
    void defaultCreateAssignmentTypeIsInternal() {
        ServiceAssignmentType value = ServiceValidationSupport.sanitizeCreateAssignmentType(null);
        assertEquals(ServiceAssignmentType.INTERNAL, value);
    }

    @Test
    void rejectInternalWithPartnerFields() {
        ServiceValidationException exception = assertThrows(
            ServiceValidationException.class,
            () -> ServiceValidationSupport.validateAssignmentBusinessRules(
                ServiceAssignmentType.INTERNAL,
                10L,
                null
            )
        );

        assertEquals("Per servizi INTERNAL partner e prezzo partner non sono ammessi", exception.getMessage());
    }

    @Test
    void rejectIncomingWithoutPartner() {
        ServiceValidationException exception = assertThrows(
            ServiceValidationException.class,
            () -> ServiceValidationSupport.validateAssignmentBusinessRules(
                ServiceAssignmentType.INCOMING,
                null,
                null
            )
        );

        assertEquals("Il partner e` obbligatorio per servizi OUTSOURCED/INCOMING", exception.getMessage());
    }

    @Test
    void rejectOutsourcedWithoutPartnerPrice() {
        ServiceValidationException exception = assertThrows(
            ServiceValidationException.class,
            () -> ServiceValidationSupport.validateAssignmentBusinessRules(
                ServiceAssignmentType.OUTSOURCED,
                12L,
                null
            )
        );

        assertEquals("Il prezzo partner e` obbligatorio e non negativo per OUTSOURCED", exception.getMessage());
    }

    @Test
    void rejectIncomingToInternalTransition() {
        ServiceValidationException exception = assertThrows(
            ServiceValidationException.class,
            () -> ServiceValidationSupport.validateAssignmentTransition(
                ServiceAssignmentType.INCOMING,
                ServiceAssignmentType.INTERNAL
            )
        );

        assertEquals("Un servizio INCOMING non puo` diventare INTERNAL", exception.getMessage());
    }

    @Test
    void calculateMarginWhenBothPricesPresent() {
        BigDecimal margin = ServiceValidationSupport.calculateMargin(
            new BigDecimal("150.00"),
            new BigDecimal("95.00")
        );

        assertEquals(new BigDecimal("55.00"), margin);
    }

    @Test
    void calculateMarginIsNullWhenMissingPrice() {
        assertNull(ServiceValidationSupport.calculateMargin(new BigDecimal("150.00"), null));
    }
}
