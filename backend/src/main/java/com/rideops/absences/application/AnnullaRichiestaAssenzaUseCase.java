package com.rideops.absences.application;

import com.rideops.absences.adapters.out.RichiestaAssenzaEntity;
import com.rideops.absences.domain.OrigineRichiestaAssenza;
import com.rideops.absences.domain.StatoRichiestaAssenza;
import java.time.LocalDate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Annullamento (master §4.4): il Driver può annullare solo fino al giorno di inizio incluso;
 * il Gestionale può sempre annullare, indipendentemente dalla data.
 */
@Service
public class AnnullaRichiestaAssenzaUseCase {

    private final RichiestaAssenzaRepositoryPort richiestaAssenzaRepositoryPort;
    private final TipoAssenzaRepositoryPort tipoAssenzaRepositoryPort;
    private final SaldiDriverService saldiDriverService;

    public AnnullaRichiestaAssenzaUseCase(RichiestaAssenzaRepositoryPort richiestaAssenzaRepositoryPort,
                                          TipoAssenzaRepositoryPort tipoAssenzaRepositoryPort,
                                          SaldiDriverService saldiDriverService) {
        this.richiestaAssenzaRepositoryPort = richiestaAssenzaRepositoryPort;
        this.tipoAssenzaRepositoryPort = tipoAssenzaRepositoryPort;
        this.saldiDriverService = saldiDriverService;
    }

    @Transactional
    public RichiestaAssenzaDto execute(long id, Long driverIdScope) {
        RichiestaAssenzaEntity entity = richiestaAssenzaRepositoryPort.findById(id)
            .orElseThrow(() -> new AssenzaNotFoundException("Richiesta di assenza non trovata"));

        if (driverIdScope != null) {
            if (!java.util.Objects.equals(driverIdScope, entity.getDriverId())) {
                throw new AssenzaNotFoundException("Richiesta di assenza non trovata");
            }
            if (entity.getOrigine() == OrigineRichiestaAssenza.GESTIONALE) {
                throw new AssenzaValidationException(
                    "Questa assenza è stata inserita dal Gestionale: rivolgiti al Gestionale per annullarla");
            }
            if (LocalDate.now().isAfter(entity.getDataInizio())) {
                throw new AssenzaValidationException(
                    "Non è più possibile annullare autonomamente: rivolgiti al Gestionale");
            }
        }

        if (entity.getStato() != StatoRichiestaAssenza.IN_ATTESA && entity.getStato() != StatoRichiestaAssenza.APPROVATA) {
            throw new AssenzaValidationException("Solo una richiesta in attesa o approvata può essere annullata");
        }

        if (entity.getStato() == StatoRichiestaAssenza.APPROVATA) {
            saldiDriverService.stornaConsumo(entity.getId());
        }
        entity.setStato(StatoRichiestaAssenza.ANNULLATA);

        RichiestaAssenzaEntity saved = richiestaAssenzaRepositoryPort.save(entity);
        return RichiestaAssenzaMapper.toDto(saved,
            tipoAssenzaRepositoryPort.findById(saved.getTipoAssenzaId().longValue()).orElse(null));
    }

}
