package com.rideops.absences.application;

import com.rideops.absences.adapters.out.RichiestaAssenzaEntity;
import com.rideops.absences.adapters.out.TipoAssenzaEntity;
import com.rideops.absences.domain.OrigineRichiestaAssenza;
import com.rideops.absences.domain.StatoRichiestaAssenza;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.EnumSet;
import org.springframework.stereotype.Service;

/**
 * Crea una richiesta di assenza inviata dal driver (master §3, POST /api/richieste-assenza).
 * Origine sempre DRIVER, stato iniziale sempre IN_ATTESA (approvazione singola del Gestionale, §4.3 punto 1).
 */
@Service
public class CreateRichiestaAssenzaUseCase {

    private final RichiestaAssenzaRepositoryPort richiestaAssenzaRepositoryPort;
    private final TipoAssenzaRepositoryPort tipoAssenzaRepositoryPort;

    public CreateRichiestaAssenzaUseCase(RichiestaAssenzaRepositoryPort richiestaAssenzaRepositoryPort,
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
                                       String motivazione) {
        TipoAssenzaEntity tipoAssenza = tipoAssenzaRepositoryPort.findById(tipoAssenzaId)
            .orElseThrow(() -> new AssenzaNotFoundException("Tipo di assenza non trovato"));

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
        entity.setMotivazione(motivazione);

        RichiestaAssenzaEntity saved = richiestaAssenzaRepositoryPort.save(entity);
        return RichiestaAssenzaMapper.toDto(saved, tipoAssenza);
    }
}
