package com.rideops.absences.application;

import com.rideops.absences.adapters.out.RichiestaAssenzaEntity;
import com.rideops.absences.domain.StatoRichiestaAssenza;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface RichiestaAssenzaRepositoryPort {

    RichiestaAssenzaEntity save(RichiestaAssenzaEntity entity);

    Optional<RichiestaAssenzaEntity> findById(Long id);

    List<RichiestaAssenzaEntity> findAllForTenant();

    List<RichiestaAssenzaEntity> findAllForDriver(Long driverId);

    long countPendingForTenant();

    List<RichiestaAssenzaEntity> findOverlapping(Long driverId,
                                                 Collection<StatoRichiestaAssenza> statiOccupanti,
                                                 LocalDate dataInizio,
                                                 LocalDate dataFine);
}
