package com.rideops.absences.application;

import com.rideops.absences.adapters.out.RichiestaAssenzaEntity;
import com.rideops.absences.adapters.out.TipoAssenzaEntity;
import com.rideops.absences.domain.OrigineRichiestaAssenza;
import com.rideops.absences.domain.StatoRichiestaAssenza;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.EnumSet;
import org.springframework.stereotype.Service;

/**
 * Inserimento diretto da parte del Gestionale (assenza per conto del driver o sganciamento).
 * Nasce già APPROVATA (master §4.3 punto 2): in R1 non esiste il flusso di ferie scadute, quindi
 * richiedeApprovazioneEccezionale resta sempre false (colonna predisposta ma non valorizzata, cfr. brief R1).
 */
@Service
public class InserimentoGestionaleAssenzaUseCase {

    private final RichiestaAssenzaRepositoryPort richiestaAssenzaRepositoryPort;
    private final TipoAssenzaRepositoryPort tipoAssenzaRepositoryPort;

    public InserimentoGestionaleAssenzaUseCase(RichiestaAssenzaRepositoryPort richiestaAssenzaRepositoryPort,
                                               TipoAssenzaRepositoryPort tipoAssenzaRepositoryPort) {
        this.richiestaAssenzaRepositoryPort = richiestaAssenzaRepositoryPort;
        this.tipoAssenzaRepositoryPort = tipoAssenzaRepositoryPort;
    }

    public RichiestaAssenzaDto execute(Long driverId,
                                       Long tipoAssenzaId,
                                       LocalDate dataInizio,
                                       LocalDate dataFine,
                                       boolean giornataIntera,
                                       LocalTime oraInizio,
                                       LocalTime oraFine,
                                       String motivazione,
                                       Long gestionaleUserId) {
        TipoAssenzaEntity tipoAssenza = tipoAssenzaRepositoryPort.findById(tipoAssenzaId)
            .orElseThrow(() -> new AssenzaNotFoundException("Tipo di assenza non trovato"));

        RichiestaAssenzaValidationSupport.validate(
            tipoAssenza,
            OrigineRichiestaAssenza.GESTIONALE,
            dataInizio,
            dataFine,
            giornataIntera,
            oraInizio,
            oraFine,
            richiestaAssenzaRepositoryPort.findOverlapping(
                driverId, EnumSet.of(StatoRichiestaAssenza.IN_ATTESA, StatoRichiestaAssenza.APPROVATA), dataInizio, dataFine)
        );

        LocalDateTime now = LocalDateTime.now();
        RichiestaAssenzaEntity entity = new RichiestaAssenzaEntity();
        entity.setDriverId(driverId);
        entity.setTipoAssenzaId(tipoAssenzaId);
        entity.setOrigine(OrigineRichiestaAssenza.GESTIONALE);
        entity.setDataInizio(dataInizio);
        entity.setDataFine(dataFine);
        entity.setGiornataIntera(giornataIntera);
        entity.setOraInizio(oraInizio);
        entity.setOraFine(oraFine);
        entity.setStato(StatoRichiestaAssenza.APPROVATA);
        entity.setMotivazione(motivazione);
        entity.setApprovataDa(gestionaleUserId);
        entity.setDataDecisione(now);

        RichiestaAssenzaEntity saved = richiestaAssenzaRepositoryPort.save(entity);
        return RichiestaAssenzaMapper.toDto(saved, tipoAssenza);
    }
}
