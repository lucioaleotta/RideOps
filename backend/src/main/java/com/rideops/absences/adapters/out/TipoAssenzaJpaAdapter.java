package com.rideops.absences.adapters.out;

import com.rideops.absences.application.TipoAssenzaRepositoryPort;
import java.util.List;
import java.util.Optional;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;
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
    public List<TipoAssenzaEntity> findAll() {
        return tipoAssenzaRepository.findAllByOrderByNomeAsc();
    }

    @Override
    public TipoAssenzaEntity save(@NonNull TipoAssenzaEntity entity) {
        return tipoAssenzaRepository.save(entity);
    }

    @Override
    public Optional<TipoAssenzaEntity> findById(Long id) {
        if (id == null) {
            return Optional.empty();
        }
        return tipoAssenzaRepository.findById(id.longValue());
    }

    @Override
    public Optional<TipoAssenzaEntity> findByCodice(@Nullable String codice) {
        if (codice == null) {
            return Optional.empty();
        }
        return tipoAssenzaRepository.findByCodice(codice);
    }
}
