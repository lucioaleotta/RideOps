package com.rideops.absences.application;

import com.rideops.absences.adapters.out.RichiestaAssenzaEntity;
import com.rideops.absences.domain.StatoRichiestaAssenza;
import java.time.LocalDate;
import org.springframework.stereotype.Service;

/**
 * Annullamento (master §4.4): il Driver può annullare solo fino al giorno di inizio incluso;
 * il Gestionale può sempre annullare, indipendentemente dalla data.
 */
@Service
public class AnnullaRichiestaAssenzaUseCase {

    private final RichiestaAssenzaRepositoryPort richiestaAssenzaRepositoryPort;
    private final TipoAssenzaRepositoryPort tipoAssenzaRepositoryPort;

    public AnnullaRichiestaAssenzaUseCase(RichiestaAssenzaRepositoryPort richiestaAssenzaRepositoryPort,
                                          TipoAssenzaRepositoryPort tipoAssenzaRepositoryPort) {
        this.richiestaAssenzaRepositoryPort = richiestaAssenzaRepositoryPort;
        this.tipoAssenzaRepositoryPort = tipoAssenzaRepositoryPort;
    }

    public RichiestaAssenzaDto execute(Long id, Long driverIdScope) {
        RichiestaAssenzaEntity entity = richiestaAssenzaRepositoryPort.findById(id)
            .orElseThrow(() -> new AssenzaNotFoundException("Richiesta di assenza non trovata"));

        boolean isDriverRequest = driverIdScope != null;
        if (isDriverRequest) {
            if (!driverIdScope.equals(entity.getDriverId())) {
                throw new AssenzaNotFoundException("Richiesta di assenza non trovata");
            }
            if (LocalDate.now().isAfter(entity.getDataInizio())) {
                throw new AssenzaValidationException(
                    "Non è più possibile annullare autonomamente: rivolgiti al Gestionale");
            }
        }

        if (entity.getStato() != StatoRichiestaAssenza.IN_ATTESA && entity.getStato() != StatoRichiestaAssenza.APPROVATA) {
            throw new AssenzaValidationException("Solo una richiesta in attesa o approvata può essere annullata");
        }

        entity.setStato(StatoRichiestaAssenza.ANNULLATA);

        RichiestaAssenzaEntity saved = richiestaAssenzaRepositoryPort.save(entity);
        return RichiestaAssenzaMapper.toDto(saved, tipoAssenzaRepositoryPort.findById(saved.getTipoAssenzaId()).orElse(null));
    }
}
