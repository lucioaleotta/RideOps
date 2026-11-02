package com.rideops.absences.application;

import com.rideops.absences.adapters.out.RichiestaAssenzaEntity;
import com.rideops.absences.adapters.out.TipoAssenzaEntity;
import com.rideops.absences.domain.OrigineRichiestaAssenza;
import com.rideops.absences.domain.StatoRichiestaAssenza;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Objects;
import java.util.EnumSet;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

/**
 * Inserimento diretto da parte del Gestionale (assenza per conto del driver o sganciamento).
 * Nasce APPROVATA salvo che il saldo FER scaduto richieda una conferma esplicita (master §4.3 e §4.4).
 */
@Service
public class InserimentoGestionaleAssenzaUseCase {

    private final RichiestaAssenzaRepositoryPort richiestaAssenzaRepositoryPort;
    private final TipoAssenzaRepositoryPort tipoAssenzaRepositoryPort;
    private final SaldiDriverService saldiDriverService;
    private final VerificaConflittiAssenzaService verificaConflittiAssenzaService;

    public InserimentoGestionaleAssenzaUseCase(RichiestaAssenzaRepositoryPort richiestaAssenzaRepositoryPort,
                                               TipoAssenzaRepositoryPort tipoAssenzaRepositoryPort,
                                               SaldiDriverService saldiDriverService,
                                               VerificaConflittiAssenzaService verificaConflittiAssenzaService) {
        this.richiestaAssenzaRepositoryPort = richiestaAssenzaRepositoryPort;
        this.tipoAssenzaRepositoryPort = tipoAssenzaRepositoryPort;
        this.saldiDriverService = saldiDriverService;
        this.verificaConflittiAssenzaService = verificaConflittiAssenzaService;
    }

    @Transactional
    public RichiestaAssenzaDto execute(long driverId,
                                       long tipoAssenzaId,
                                       LocalDate dataInizio,
                                       LocalDate dataFine,
                                       boolean giornataIntera,
                                       LocalTime oraInizio,
                                       LocalTime oraFine,
                                       String motivazione,
                                       long gestionaleUserId) {
                        LocalDate dataInizioRichiesta = Objects.requireNonNull(dataInizio, "dataInizio obbligatoria");
                        LocalDate dataFineRichiesta = Objects.requireNonNull(dataFine, "dataFine obbligatoria");
        TipoAssenzaEntity tipoAssenza = tipoAssenzaRepositoryPort.findById(tipoAssenzaId)
            .orElseThrow(() -> new AssenzaNotFoundException("Tipo di assenza non trovato"));

        RichiestaAssenzaValidationSupport.validate(
            tipoAssenza,
            OrigineRichiestaAssenza.GESTIONALE,
            dataInizioRichiesta,
            dataFineRichiesta,
            giornataIntera,
            oraInizio,
            oraFine,
            richiestaAssenzaRepositoryPort.findOverlapping(
                driverId, EnumSet.of(StatoRichiestaAssenza.IN_ATTESA, StatoRichiestaAssenza.APPROVATA), dataInizioRichiesta, dataFineRichiesta)
        );

        boolean exceptional = saldiDriverService.richiedeApprovazioneEccezionale(
            driverId, tipoAssenzaId, dataInizioRichiesta, dataFineRichiesta, giornataIntera, oraInizio, oraFine);
        if (!exceptional) {
            verificaConflittiAssenzaService.requireNoBlockingConflict(
                driverId, dataInizioRichiesta, dataFineRichiesta, giornataIntera, oraInizio, oraFine);
        }

        LocalDateTime now = LocalDateTime.now();
        RichiestaAssenzaEntity entity = new RichiestaAssenzaEntity();
        entity.setDriverId(driverId);
        entity.setTipoAssenzaId(tipoAssenzaId);
        entity.setOrigine(OrigineRichiestaAssenza.GESTIONALE);
        entity.setDataInizio(dataInizioRichiesta);
        entity.setDataFine(dataFineRichiesta);
        entity.setGiornataIntera(giornataIntera);
        entity.setOraInizio(oraInizio);
        entity.setOraFine(oraFine);
        entity.setStato(exceptional ? StatoRichiestaAssenza.IN_ATTESA : StatoRichiestaAssenza.APPROVATA);
        entity.setRichiedeApprovazioneEccezionale(exceptional);
        entity.setMotivazione(motivazione);
        if (!exceptional) {
            entity.setApprovataDa(gestionaleUserId);
            entity.setDataDecisione(now);
        }

        RichiestaAssenzaEntity saved = richiestaAssenzaRepositoryPort.save(entity);
        if (!exceptional) {
            saldiDriverService.consuma(saved);
        }
        return RichiestaAssenzaMapper.toDto(saved, tipoAssenza);
    }
}
