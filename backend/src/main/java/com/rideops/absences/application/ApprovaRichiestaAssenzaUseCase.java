package com.rideops.absences.application;

import com.rideops.absences.adapters.out.RichiestaAssenzaEntity;
import com.rideops.absences.domain.StatoRichiestaAssenza;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;

/**
 * Approvazione di una richiesta (master §4.3): applicabile a richieste driver in attesa,
 * o a inserimenti gestionale con richiedeApprovazioneEccezionale=true (non ancora attivabile in R1).
 */
@Service
public class ApprovaRichiestaAssenzaUseCase {

    private final RichiestaAssenzaRepositoryPort richiestaAssenzaRepositoryPort;
    private final TipoAssenzaRepositoryPort tipoAssenzaRepositoryPort;

    public ApprovaRichiestaAssenzaUseCase(RichiestaAssenzaRepositoryPort richiestaAssenzaRepositoryPort,
                                          TipoAssenzaRepositoryPort tipoAssenzaRepositoryPort) {
        this.richiestaAssenzaRepositoryPort = richiestaAssenzaRepositoryPort;
        this.tipoAssenzaRepositoryPort = tipoAssenzaRepositoryPort;
    }

    public RichiestaAssenzaDto execute(Long id, Long gestionaleUserId) {
        RichiestaAssenzaEntity entity = richiestaAssenzaRepositoryPort.findById(id)
            .orElseThrow(() -> new AssenzaNotFoundException("Richiesta di assenza non trovata"));

        if (entity.getStato() != StatoRichiestaAssenza.IN_ATTESA) {
            throw new AssenzaValidationException("Solo una richiesta in attesa può essere approvata");
        }

        entity.setStato(StatoRichiestaAssenza.APPROVATA);
        entity.setApprovataDa(gestionaleUserId);
        entity.setDataDecisione(LocalDateTime.now());

        RichiestaAssenzaEntity saved = richiestaAssenzaRepositoryPort.save(entity);
        return RichiestaAssenzaMapper.toDto(saved, tipoAssenzaRepositoryPort.findById(saved.getTipoAssenzaId()).orElse(null));
    }
}
