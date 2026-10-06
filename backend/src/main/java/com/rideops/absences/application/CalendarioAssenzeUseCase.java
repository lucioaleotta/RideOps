package com.rideops.absences.application;

import com.rideops.absences.domain.StatoRichiestaAssenza;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;

@Service
public class CalendarioAssenzeUseCase {

    private final RichiestaAssenzaRepositoryPort richiestaRepository;
    private final TipoAssenzaRepositoryPort tipoRepository;

    public CalendarioAssenzeUseCase(RichiestaAssenzaRepositoryPort richiestaRepository,
                                    TipoAssenzaRepositoryPort tipoRepository) {
        this.richiestaRepository = richiestaRepository;
        this.tipoRepository = tipoRepository;
    }

    public List<CalendarioAssenzaDto> execute(@NonNull LocalDate from, @NonNull LocalDate to) {
        if (from.isAfter(to)) {
            throw new AssenzaValidationException("La data iniziale deve precedere o coincidere con la data finale");
        }
        if (to.isAfter(from.plusYears(1))) {
            throw new AssenzaValidationException("L'intervallo calendario non può superare un anno");
        }

        Map<Long, com.rideops.absences.adapters.out.TipoAssenzaEntity> tipi = new HashMap<>();
        return richiestaRepository.findAllForTenant().stream()
            .filter(request -> request.getStato() == StatoRichiestaAssenza.APPROVATA)
            .filter(request -> !request.getDataFine().isBefore(from) && !request.getDataInizio().isAfter(to))
            .map(request -> {
                Long tipoId = request.getTipoAssenzaId();
                var tipo = tipi.get(tipoId);
                if (tipo == null && !tipi.containsKey(tipoId)) {
                    tipo = tipoRepository.findById(tipoId.longValue()).orElse(null);
                    tipi.put(tipoId, tipo);
                }
                return new CalendarioAssenzaDto(request.getId(), request.getDriverId(), request.getTipoAssenzaId(),
                    tipo == null ? null : tipo.getCodice(), tipo == null ? null : tipo.getNome(),
                    request.getDataInizio(), request.getDataFine(), request.isGiornataIntera(),
                    request.getOraInizio(), request.getOraFine(), request.getOrigine(),
                    request.isRichiedeApprovazioneEccezionale());
            })
            .toList();
    }
}