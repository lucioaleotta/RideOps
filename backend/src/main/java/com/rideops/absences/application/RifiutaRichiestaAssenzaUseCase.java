package com.rideops.absences.application;

import com.rideops.absences.adapters.out.RichiestaAssenzaEntity;
import com.rideops.absences.domain.StatoRichiestaAssenza;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Rifiuto di una richiesta in attesa (master §3, PATCH /api/richieste-assenza/:id/rifiuta).
 * Richiede sempre un motivo di rifiuto.
 */
@Service
public class RifiutaRichiestaAssenzaUseCase {

    private final RichiestaAssenzaRepositoryPort richiestaAssenzaRepositoryPort;
    private final TipoAssenzaRepositoryPort tipoAssenzaRepositoryPort;

    public RifiutaRichiestaAssenzaUseCase(RichiestaAssenzaRepositoryPort richiestaAssenzaRepositoryPort,
                                          TipoAssenzaRepositoryPort tipoAssenzaRepositoryPort) {
        this.richiestaAssenzaRepositoryPort = richiestaAssenzaRepositoryPort;
        this.tipoAssenzaRepositoryPort = tipoAssenzaRepositoryPort;
    }

    public RichiestaAssenzaDto execute(Long id, String motivoRifiuto, Long gestionaleUserId) {
        if (!StringUtils.hasText(motivoRifiuto)) {
            throw new AssenzaValidationException("Il motivo del rifiuto è obbligatorio");
        }

        RichiestaAssenzaEntity entity = richiestaAssenzaRepositoryPort.findById(id)
            .orElseThrow(() -> new AssenzaNotFoundException("Richiesta di assenza non trovata"));

        if (entity.getStato() != StatoRichiestaAssenza.IN_ATTESA) {
            throw new AssenzaValidationException("Solo una richiesta in attesa può essere rifiutata");
        }

        entity.setStato(StatoRichiestaAssenza.RIFIUTATA);
        entity.setMotivoRifiuto(motivoRifiuto);
        entity.setApprovataDa(gestionaleUserId);
        entity.setDataDecisione(LocalDateTime.now());

        RichiestaAssenzaEntity saved = richiestaAssenzaRepositoryPort.save(entity);
        return RichiestaAssenzaMapper.toDto(saved, tipoAssenzaRepositoryPort.findById(saved.getTipoAssenzaId()).orElse(null));
    }
}
