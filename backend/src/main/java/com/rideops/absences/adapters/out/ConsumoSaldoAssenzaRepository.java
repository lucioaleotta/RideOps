package com.rideops.absences.adapters.out;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConsumoSaldoAssenzaRepository extends JpaRepository<ConsumoSaldoAssenzaEntity, Long> {

    List<ConsumoSaldoAssenzaEntity> findAllByRichiestaAssenzaIdAndStornatoFalse(Long richiestaAssenzaId);
}