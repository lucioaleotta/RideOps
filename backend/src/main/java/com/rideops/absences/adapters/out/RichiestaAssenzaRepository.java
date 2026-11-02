package com.rideops.absences.adapters.out;

import com.rideops.absences.domain.StatoRichiestaAssenza;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RichiestaAssenzaRepository extends JpaRepository<RichiestaAssenzaEntity, Long> {

    Optional<RichiestaAssenzaEntity> findByIdAndTenantId(Long id, Long tenantId);

    List<RichiestaAssenzaEntity> findAllByTenantIdOrderByDataInizioDesc(Long tenantId);

    List<RichiestaAssenzaEntity> findAllByTenantIdAndDriverIdOrderByDataInizioDesc(Long tenantId, Long driverId);

    long countByTenantIdAndStato(Long tenantId, StatoRichiestaAssenza stato);

    List<RichiestaAssenzaEntity> findAllByDriverIdAndStatoInAndDataInizioLessThanEqualAndDataFineGreaterThanEqual(
        Long driverId,
        Collection<StatoRichiestaAssenza> stati,
        LocalDate dataFine,
        LocalDate dataInizio
    );
}
