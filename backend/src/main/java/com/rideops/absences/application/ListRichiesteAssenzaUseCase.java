package com.rideops.absences.application;

import com.rideops.absences.adapters.out.RichiestaAssenzaEntity;
import com.rideops.absences.adapters.out.TipoAssenzaEntity;
import com.rideops.absences.domain.OrigineRichiestaAssenza;
import com.rideops.absences.domain.StatoRichiestaAssenza;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

/**
 * Elenco richieste con filtri opzionali (master §3, GET /api/richieste-assenza).
 * Se {@code driverIdScope} è valorizzato, la vista è ristretta a quel driver (accesso Driver sulla
 * propria situazione); altrimenti vengono restituite tutte le richieste del tenant (accesso Gestionale).
 */
@Service
public class ListRichiesteAssenzaUseCase {

    private final RichiestaAssenzaRepositoryPort richiestaAssenzaRepositoryPort;
    private final TipoAssenzaRepositoryPort tipoAssenzaRepositoryPort;
    private final VerificaConflittiAssenzaService verificaConflittiAssenzaService;

    @Autowired
    public ListRichiesteAssenzaUseCase(RichiestaAssenzaRepositoryPort richiestaAssenzaRepositoryPort,
                                       TipoAssenzaRepositoryPort tipoAssenzaRepositoryPort,
                                       VerificaConflittiAssenzaService verificaConflittiAssenzaService) {
        this.richiestaAssenzaRepositoryPort = richiestaAssenzaRepositoryPort;
        this.tipoAssenzaRepositoryPort = tipoAssenzaRepositoryPort;
        this.verificaConflittiAssenzaService = verificaConflittiAssenzaService;
    }

    public List<RichiestaAssenzaDto> execute(Long driverIdScope,
                                             Long driverIdFilter,
                                             StatoRichiestaAssenza statoFilter,
                                             Long tipoAssenzaIdFilter,
                                             OrigineRichiestaAssenza origineFilter,
                                             LocalDate dataInizioFilter,
                                             LocalDate dataFineFilter) {
        return execute(driverIdScope, driverIdFilter, statoFilter, tipoAssenzaIdFilter,
            origineFilter, dataInizioFilter, dataFineFilter, false);
    }

    public long countPendingForTenant() {
        return richiestaAssenzaRepositoryPort.countPendingForTenant();
    }

    public List<RichiestaAssenzaDto> execute(Long driverIdScope,
                                             Long driverIdFilter,
                                             StatoRichiestaAssenza statoFilter,
                                             Long tipoAssenzaIdFilter,
                                             OrigineRichiestaAssenza origineFilter,
                                             LocalDate dataInizioFilter,
                                             LocalDate dataFineFilter,
                                             boolean includeTurnConflicts) {
        List<RichiestaAssenzaEntity> base = driverIdScope != null
            ? richiestaAssenzaRepositoryPort.findAllForDriver(driverIdScope)
            : richiestaAssenzaRepositoryPort.findAllForTenant();

        Map<Long, TipoAssenzaEntity> tipoAssenzaCache = new HashMap<>();

        return base.stream()
            .filter(r -> driverIdFilter == null || driverIdFilter.equals(r.getDriverId()))
            .filter(r -> statoFilter == null || statoFilter == r.getStato())
            .filter(r -> tipoAssenzaIdFilter == null || tipoAssenzaIdFilter.equals(r.getTipoAssenzaId()))
            .filter(r -> origineFilter == null || origineFilter == r.getOrigine())
            .filter(r -> dataInizioFilter == null || !r.getDataFine().isBefore(dataInizioFilter))
            .filter(r -> dataFineFilter == null || !r.getDataInizio().isAfter(dataFineFilter))
            .map(r -> RichiestaAssenzaMapper.toDto(r,
                resolveTipoAssenza(r.getTipoAssenzaId().longValue(), tipoAssenzaCache),
                includeTurnConflicts && (r.getStato() == StatoRichiestaAssenza.IN_ATTESA
                    || r.getStato() == StatoRichiestaAssenza.APPROVATA)
                    ? verificaConflittiAssenzaService.trova(r.getDriverId(), r.getDataInizio(), r.getDataFine(),
                        r.isGiornataIntera(), r.getOraInizio(), r.getOraFine())
                    : List.of()))
            .toList();
    }

    private TipoAssenzaEntity resolveTipoAssenza(long tipoAssenzaId, Map<Long, TipoAssenzaEntity> cache) {
        Long key = tipoAssenzaId;
        if (!cache.containsKey(key)) {
            cache.put(key, tipoAssenzaRepositoryPort.findById(tipoAssenzaId).orElse(null));
        }
        return cache.get(key);
    }
}
