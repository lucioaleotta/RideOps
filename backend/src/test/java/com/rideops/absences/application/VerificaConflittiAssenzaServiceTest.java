package com.rideops.absences.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.when;

import com.rideops.services.application.DriverScheduleConflictService;
import com.rideops.services.application.DriverServiceConflict;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class VerificaConflittiAssenzaServiceTest {

    @Mock private DriverScheduleConflictService driverScheduleConflictService;
    @Mock private ConfigurazioneAssenzeService configurazioneAssenzeService;

    private VerificaConflittiAssenzaService service;
    private List<DriverServiceConflict> conflicts;

    @BeforeEach
    void setUp() {
        service = new VerificaConflittiAssenzaService(driverScheduleConflictService, configurazioneAssenzeService);
        conflicts = List.of(new DriverServiceConflict(87L, LocalDateTime.of(2026, 10, 5, 9, 0), 2,
            "Sede", "Aeroporto"));
        when(driverScheduleConflictService.findConflicts(12L, LocalDate.of(2026, 10, 5),
            LocalDate.of(2026, 10, 5), true, null, null)).thenReturn(conflicts);
    }

    @Test
    void conflictIsInformationalWhenTenantRuleIsSegnala() {
        when(configurazioneAssenzeService.getGeneralRules()).thenReturn(new RegoleGeneraliAssenzaDto("SEGNALA", "SEGNALA"));

        service.requireNoBlockingConflict(12L, LocalDate.of(2026, 10, 5), LocalDate.of(2026, 10, 5), true, null, null);

        assertEquals(1, service.trova(12L, LocalDate.of(2026, 10, 5), LocalDate.of(2026, 10, 5), true, null, null).size());
    }

    @Test
    void conflictBlocksApprovalWhenTenantRuleIsSegnalaEBlocca() {
        when(configurazioneAssenzeService.getGeneralRules())
            .thenReturn(new RegoleGeneraliAssenzaDto("SEGNALA_E_BLOCCA", "SEGNALA"));

        AssenzaValidationException exception = assertThrows(AssenzaValidationException.class,
            () -> service.requireNoBlockingConflict(12L, LocalDate.of(2026, 10, 5),
                LocalDate.of(2026, 10, 5), true, null, null));

        assertEquals("Approvazione bloccata: il driver ha 1 servizio/i assegnato/i nel periodo richiesto", exception.getMessage());
    }
}
