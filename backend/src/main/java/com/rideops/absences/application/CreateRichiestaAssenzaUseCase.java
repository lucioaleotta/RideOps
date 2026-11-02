package com.rideops.absences.application;

import com.rideops.absences.adapters.out.RichiestaAssenzaEntity;
import com.rideops.absences.adapters.out.TipoAssenzaEntity;
import com.rideops.absences.domain.OrigineRichiestaAssenza;
import com.rideops.absences.domain.StatoRichiestaAssenza;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.EnumSet;
import java.time.temporal.ChronoUnit;
import org.springframework.stereotype.Service;

/**
 * Crea una richiesta di assenza inviata dal driver (master §3, POST /api/richieste-assenza).
 * Origine sempre DRIVER, stato iniziale sempre IN_ATTESA (approvazione singola del Gestionale, §4.3 punto 1).
 */
@Service
public class CreateRichiestaAssenzaUseCase {

    private final RichiestaAssenzaRepositoryPort richiestaAssenzaRepositoryPort;
    private final TipoAssenzaRepositoryPort tipoAssenzaRepositoryPort;
    private final ConfigurazioneAssenzeService configurazioneAssenzeService;
    private final SaldiDriverService saldiDriverService;

    public CreateRichiestaAssenzaUseCase(RichiestaAssenzaRepositoryPort richiestaAssenzaRepositoryPort,
                                         TipoAssenzaRepositoryPort tipoAssenzaRepositoryPort,
                                         ConfigurazioneAssenzeService configurazioneAssenzeService,
                                         SaldiDriverService saldiDriverService) {
        this.richiestaAssenzaRepositoryPort = richiestaAssenzaRepositoryPort;
        this.tipoAssenzaRepositoryPort = tipoAssenzaRepositoryPort;
        this.configurazioneAssenzeService = configurazioneAssenzeService;
        this.saldiDriverService = saldiDriverService;
    }

    public RichiestaAssenzaDto execute(long driverId,
                                       long tipoAssenzaId,
                                       LocalDate dataInizio,
                                       LocalDate dataFine,
                                       boolean giornataIntera,
                                       LocalTime oraInizio,
                                       LocalTime oraFine,
                                       String motivazione) {
        TipoAssenzaEntity tipoAssenza = tipoAssenzaRepositoryPort.findById(tipoAssenzaId)
            .orElseThrow(() -> new AssenzaNotFoundException("Tipo di assenza non trovato"));

        ConfigurazioneAssenzaDto configurazione = configurazioneAssenzeService
            .resolveEffectiveConfiguration(driverId, tipoAssenzaId);
        if (!configurazione.abilitato()) {
            throw new AssenzaValidationException("Il tipo di assenza non è abilitato per questo driver");
        }

        RichiestaAssenzaValidationSupport.validate(
            tipoAssenza,
            OrigineRichiestaAssenza.DRIVER,
            dataInizio,
            dataFine,
            giornataIntera,
            oraInizio,
            oraFine,
            richiestaAssenzaRepositoryPort.findOverlapping(
                driverId, EnumSet.of(StatoRichiestaAssenza.IN_ATTESA, StatoRichiestaAssenza.APPROVATA), dataInizio, dataFine)
        );

        long daysUntilStart = ChronoUnit.DAYS.between(LocalDate.now(), dataInizio);
        if (daysUntilStart < configurazione.preavvisoMinimoGiorni()) {
            throw new AssenzaValidationException("Questa richiesta richiede almeno "
                + configurazione.preavvisoMinimoGiorni() + " giorni di preavviso");
        }

        boolean exceptional = saldiDriverService.richiedeApprovazioneEccezionale(
            driverId, tipoAssenzaId, dataInizio, dataFine, giornataIntera, oraInizio, oraFine);
        RichiestaAssenzaEntity entity = new RichiestaAssenzaEntity();
        entity.setDriverId(driverId);
        entity.setTipoAssenzaId(tipoAssenzaId);
        entity.setOrigine(OrigineRichiestaAssenza.DRIVER);
        entity.setDataInizio(dataInizio);
        entity.setDataFine(dataFine);
        entity.setGiornataIntera(giornataIntera);
        entity.setOraInizio(oraInizio);
        entity.setOraFine(oraFine);
        entity.setStato(StatoRichiestaAssenza.IN_ATTESA);
        entity.setRichiedeApprovazioneEccezionale(exceptional);
        entity.setMotivazione(motivazione);

        RichiestaAssenzaEntity saved = richiestaAssenzaRepositoryPort.save(entity);
        return RichiestaAssenzaMapper.toDto(saved, tipoAssenza);
    }
}
