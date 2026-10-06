package com.rideops.absences.application;

import com.rideops.absences.adapters.out.RichiestaAssenzaEntity;
import com.rideops.absences.domain.StatoRichiestaAssenza;
import java.time.LocalDateTime;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Approvazione di una richiesta (master §4.3): applicabile a richieste driver in attesa,
 * o a inserimenti Gestionale con richiedeApprovazioneEccezionale=true per conferma di quota FER scaduta.
 */
@Service
public class ApprovaRichiestaAssenzaUseCase {

    private final RichiestaAssenzaRepositoryPort richiestaAssenzaRepositoryPort;
    private final TipoAssenzaRepositoryPort tipoAssenzaRepositoryPort;
    private final SaldiDriverService saldiDriverService;
    private final VerificaConflittiAssenzaService verificaConflittiAssenzaService;

    public ApprovaRichiestaAssenzaUseCase(RichiestaAssenzaRepositoryPort richiestaAssenzaRepositoryPort,
                                          TipoAssenzaRepositoryPort tipoAssenzaRepositoryPort,
                                          SaldiDriverService saldiDriverService,
                                          VerificaConflittiAssenzaService verificaConflittiAssenzaService) {
        this.richiestaAssenzaRepositoryPort = richiestaAssenzaRepositoryPort;
        this.tipoAssenzaRepositoryPort = tipoAssenzaRepositoryPort;
        this.saldiDriverService = saldiDriverService;
        this.verificaConflittiAssenzaService = verificaConflittiAssenzaService;
    }

    @Transactional
    public RichiestaAssenzaDto execute(long id, long gestionaleUserId) {
        RichiestaAssenzaEntity entity = richiestaAssenzaRepositoryPort.findById(id)
            .orElseThrow(() -> new AssenzaNotFoundException("Richiesta di assenza non trovata"));

        if (entity.getStato() != StatoRichiestaAssenza.IN_ATTESA) {
            throw new AssenzaValidationException("Solo una richiesta in attesa può essere approvata");
        }

        verificaConflittiAssenzaService.requireNoBlockingConflict(entity.getDriverId(), entity.getDataInizio(),
            entity.getDataFine(), entity.isGiornataIntera(), entity.getOraInizio(), entity.getOraFine());
        saldiDriverService.consuma(entity);

        entity.setStato(StatoRichiestaAssenza.APPROVATA);
        entity.setApprovataDa(gestionaleUserId);
        entity.setDataDecisione(LocalDateTime.now());

        RichiestaAssenzaEntity saved = richiestaAssenzaRepositoryPort.save(entity);
        return RichiestaAssenzaMapper.toDto(saved,
            tipoAssenzaRepositoryPort.findById(saved.getTipoAssenzaId().longValue()).orElse(null),
            verificaConflittiAssenzaService.trova(saved.getDriverId(), saved.getDataInizio(), saved.getDataFine(),
                saved.isGiornataIntera(), saved.getOraInizio(), saved.getOraFine()));
    }
}
