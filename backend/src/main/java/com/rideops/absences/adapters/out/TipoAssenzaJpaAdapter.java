package com.rideops.absences.adapters.out;

import com.rideops.absences.application.TipoAssenzaRepositoryPort;
import java.util.List;
import java.util.Optional;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;

@Component
public class TipoAssenzaJpaAdapter implements TipoAssenzaRepositoryPort {

    private final TipoAssenzaRepository tipoAssenzaRepository;

    public TipoAssenzaJpaAdapter(TipoAssenzaRepository tipoAssenzaRepository) {
        this.tipoAssenzaRepository = tipoAssenzaRepository;
    }

    @Override
    public List<TipoAssenzaEntity> findAllAttivi() {
        return tipoAssenzaRepository.findAllByAttivoTrueOrderByNomeAsc();
    }

    @Override
    public Optional<TipoAssenzaEntity> findById(@NonNull Long id) {
        return tipoAssenzaRepository.findById(id);
    }

    @Override
    public Optional<TipoAssenzaEntity> findByCodice(@NonNull String codice) {
        return tipoAssenzaRepository.findByCodice(codice);
    }
}
