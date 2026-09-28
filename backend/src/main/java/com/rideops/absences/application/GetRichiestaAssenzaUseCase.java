package com.rideops.absences.application;

import com.rideops.absences.adapters.out.RichiestaAssenzaEntity;
import org.springframework.stereotype.Service;

/**
 * Dettaglio richiesta (master §3, GET /api/richieste-assenza/:id).
 * L'accesso del Driver alla propria richiesta è vincolato dal controller (driverIdScope).
 */
@Service
public class GetRichiestaAssenzaUseCase {

    private final RichiestaAssenzaRepositoryPort richiestaAssenzaRepositoryPort;
    private final TipoAssenzaRepositoryPort tipoAssenzaRepositoryPort;

    public GetRichiestaAssenzaUseCase(RichiestaAssenzaRepositoryPort richiestaAssenzaRepositoryPort,
                                      TipoAssenzaRepositoryPort tipoAssenzaRepositoryPort) {
        this.richiestaAssenzaRepositoryPort = richiestaAssenzaRepositoryPort;
        this.tipoAssenzaRepositoryPort = tipoAssenzaRepositoryPort;
    }

    public RichiestaAssenzaDto execute(Long id, Long driverIdScope) {
        RichiestaAssenzaEntity entity = richiestaAssenzaRepositoryPort.findById(id)
            .orElseThrow(() -> new AssenzaNotFoundException("Richiesta di assenza non trovata"));

        if (driverIdScope != null && !driverIdScope.equals(entity.getDriverId())) {
            throw new AssenzaNotFoundException("Richiesta di assenza non trovata");
        }

        return RichiestaAssenzaMapper.toDto(entity, tipoAssenzaRepositoryPort.findById(entity.getTipoAssenzaId()).orElse(null));
    }
}
