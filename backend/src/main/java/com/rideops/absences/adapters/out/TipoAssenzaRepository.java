package com.rideops.absences.adapters.out;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TipoAssenzaRepository extends JpaRepository<TipoAssenzaEntity, Long> {

    List<TipoAssenzaEntity> findAllByAttivoTrueOrderByNomeAsc();

    List<TipoAssenzaEntity> findAllByOrderByNomeAsc();

    Optional<TipoAssenzaEntity> findByCodice(String codice);
}
