package com.rideops.absences.application;

import com.rideops.absences.adapters.out.RichiestaAssenzaEntity;
import com.rideops.absences.adapters.out.TipoAssenzaEntity;

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
            entity.getAggiornatoIl()
        );
    }

    static TipoAssenzaDto toDto(TipoAssenzaEntity entity) {
        return new TipoAssenzaDto(
            entity.getId(),
            entity.getCodice(),
            entity.getNome(),
            entity.getUnitaMisura(),
            entity.isOrigineDriverConsentita(),
            entity.isOrigineGestionaleConsentita(),
            entity.isRichiedeOrario(),
            entity.getPreavvisoMinimoGiorniDefault(),
            entity.isAttivo()
        );
    }
}
