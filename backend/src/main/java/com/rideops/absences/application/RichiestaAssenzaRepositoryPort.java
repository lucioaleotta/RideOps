package com.rideops.absences.application;

import com.rideops.absences.adapters.out.RichiestaAssenzaEntity;
import com.rideops.absences.domain.StatoRichiestaAssenza;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.lang.NonNull;

public interface RichiestaAssenzaRepositoryPort {

    RichiestaAssenzaEntity save(@NonNull RichiestaAssenzaEntity entity);

    Optional<RichiestaAssenzaEntity> findById(@NonNull Long id);

    List<RichiestaAssenzaEntity> findAllForTenant();

    List<RichiestaAssenzaEntity> findAllForDriver(@NonNull Long driverId);

    List<RichiestaAssenzaEntity> findOverlapping(@NonNull Long driverId,
                                                 @NonNull Collection<StatoRichiestaAssenza> statiOccupanti,
                                                 @NonNull LocalDate dataInizio,
                                                 @NonNull LocalDate dataFine);
}
