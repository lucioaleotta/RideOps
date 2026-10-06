package com.rideops.absences.application;

import com.rideops.absences.adapters.out.RichiestaAssenzaEntity;
import com.rideops.absences.adapters.out.TipoAssenzaEntity;
import org.springframework.lang.NonNull;
import java.util.List;

final class RichiestaAssenzaMapper {

    private RichiestaAssenzaMapper() {
    }

    static RichiestaAssenzaDto toDto(RichiestaAssenzaEntity entity, TipoAssenzaEntity tipoAssenza) {
        return new RichiestaAssenzaDto(
            entity.getId(),
            entity.getDriverId(),
            entity.getTipoAssenzaId(),
            tipoAssenza != null ? tipoAssenza.getCodice() : null,
            tipoAssenza != null ? tipoAssenza.getNome() : null,
            entity.getOrigine(),
            entity.getDataInizio(),
            entity.getDataFine(),
            entity.isGiornataIntera(),
            entity.getOraInizio(),
            entity.getOraFine(),
            entity.getStato(),
            entity.isRichiedeApprovazioneEccezionale(),
            entity.getMotivazione(),
            entity.getMotivoRifiuto(),
            entity.getApprovataDa(),
            entity.getDataDecisione(),
            entity.getCreatoIl(),
            entity.getAggiornatoIl(),
            List.of()
        );
    }

    static RichiestaAssenzaDto toDto(RichiestaAssenzaEntity entity,
                                     TipoAssenzaEntity tipoAssenza,
                                     List<ConflittoTurnoAssenzaDto> conflitti) {
        RichiestaAssenzaDto base = toDto(entity, tipoAssenza);
        return new RichiestaAssenzaDto(base.id(), base.driverId(), base.tipoAssenzaId(), base.tipoAssenzaCodice(),
            base.tipoAssenzaNome(), base.origine(), base.dataInizio(), base.dataFine(), base.giornataIntera(),
            base.oraInizio(), base.oraFine(), base.stato(), base.richiedeApprovazioneEccezionale(),
            base.motivazione(), base.motivoRifiuto(), base.approvataDa(), base.dataDecisione(), base.creatoIl(),
            base.aggiornatoIl(), conflitti);
    }

    @NonNull
    static TipoAssenzaDto toDto(TipoAssenzaEntity entity) {
        return new TipoAssenzaDto(
            entity.getId(),
            entity.getCodice(),
            entity.getNome(),
            entity.getUnitaMisura(),
            entity.isOrigineDriverConsentita(),
            entity.isOrigineGestionaleConsentita(),
            entity.isRichiedeOrario(),
            entity.isRichiedeDocumentoDefault(),
            entity.isScalaDaMonteOreDefault(),
            entity.getPreavvisoMinimoGiorniDefault(),
            entity.getNumeroGiorniAnnuiDefault(),
            entity.getNumeroGiorniMalattiaAnnuiDefault(),
            entity.getScadenzaFerieMesiDefault(),
            entity.isAttivo()
        );
    }
}
