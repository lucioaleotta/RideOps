package com.rideops.absences.application;

import com.rideops.services.application.DriverScheduleConflictService;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;

@Service
public class VerificaConflittiAssenzaService {

    private static final String BLOCCO = "SEGNALA_E_BLOCCA";

    private final DriverScheduleConflictService driverScheduleConflictService;
    private final ConfigurazioneAssenzeService configurazioneAssenzeService;

    public VerificaConflittiAssenzaService(DriverScheduleConflictService driverScheduleConflictService,
                                           ConfigurazioneAssenzeService configurazioneAssenzeService) {
        this.driverScheduleConflictService = driverScheduleConflictService;
        this.configurazioneAssenzeService = configurazioneAssenzeService;
    }

    public List<ConflittoTurnoAssenzaDto> trova(long driverId,
                                                @Nullable LocalDate dataInizio,
                                                @Nullable LocalDate dataFine,
                                                boolean giornataIntera,
                                                LocalTime oraInizio,
                                                LocalTime oraFine) {
        if (dataInizio == null || dataFine == null) {
            throw new AssenzaValidationException("Le date della richiesta sono obbligatorie per verificare i conflitti");
        }
        return driverScheduleConflictService.findConflicts(driverId, dataInizio, dataFine, giornataIntera, oraInizio, oraFine)
            .stream()
            .map(conflict -> new ConflittoTurnoAssenzaDto(conflict.serviceId(), conflict.startAt(),
                conflict.durationHours(), conflict.pickupLocation(), conflict.destination()))
            .toList();
    }

    public void requireNoBlockingConflict(long driverId,
                                          @Nullable LocalDate dataInizio,
                                          @Nullable LocalDate dataFine,
                                          boolean giornataIntera,
                                          LocalTime oraInizio,
                                          LocalTime oraFine) {
        if (dataInizio == null || dataFine == null) {
            throw new AssenzaValidationException("Le date della richiesta sono obbligatorie per verificare i conflitti");
        }
        List<ConflittoTurnoAssenzaDto> conflicts = trova(
            driverId, dataInizio, dataFine, giornataIntera, oraInizio, oraFine);
        if (!conflicts.isEmpty()
            && BLOCCO.equals(configurazioneAssenzeService.getGeneralRules().comportamentoConflittoTurni())) {
            throw new AssenzaValidationException(
                "Approvazione bloccata: il driver ha " + conflicts.size() + " servizio/i assegnato/i nel periodo richiesto");
        }
    }
}