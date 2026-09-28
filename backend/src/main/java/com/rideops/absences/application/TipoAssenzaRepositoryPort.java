package com.rideops.absences.application;

import com.rideops.absences.adapters.out.TipoAssenzaEntity;
import java.util.List;
import java.util.Optional;
import org.springframework.lang.NonNull;

public interface TipoAssenzaRepositoryPort {

    List<TipoAssenzaEntity> findAllAttivi();

    Optional<TipoAssenzaEntity> findById(@NonNull Long id);

    Optional<TipoAssenzaEntity> findByCodice(@NonNull String codice);
}
