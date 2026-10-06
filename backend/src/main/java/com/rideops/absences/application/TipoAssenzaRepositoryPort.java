package com.rideops.absences.application;

import com.rideops.absences.adapters.out.TipoAssenzaEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;

public interface TipoAssenzaRepositoryPort {

    List<TipoAssenzaEntity> findAllAttivi();

    List<TipoAssenzaEntity> findAll();

    TipoAssenzaEntity save(@NonNull TipoAssenzaEntity entity);

    Optional<TipoAssenzaEntity> findById(Long id);

    Optional<TipoAssenzaEntity> findByCodice(@Nullable String codice);
}
