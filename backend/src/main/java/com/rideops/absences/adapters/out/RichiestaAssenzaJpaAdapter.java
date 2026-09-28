package com.rideops.absences.adapters.out;

import com.rideops.absences.application.RichiestaAssenzaRepositoryPort;
import com.rideops.absences.domain.StatoRichiestaAssenza;
import com.rideops.multitenancy.TenantContext;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;

@Component
public class RichiestaAssenzaJpaAdapter implements RichiestaAssenzaRepositoryPort {

    private final RichiestaAssenzaRepository richiestaAssenzaRepository;
    private final TenantContext tenantContext;

    public RichiestaAssenzaJpaAdapter(RichiestaAssenzaRepository richiestaAssenzaRepository,
                                      TenantContext tenantContext) {
        this.richiestaAssenzaRepository = richiestaAssenzaRepository;
        this.tenantContext = tenantContext;
    }

    @Override
    public RichiestaAssenzaEntity save(@NonNull RichiestaAssenzaEntity entity) {
        if (entity.getTenantId() == null) {
            entity.setTenantId(tenantContext.requireTenantId());
        }
        return richiestaAssenzaRepository.save(entity);
    }

    @Override
    public Optional<RichiestaAssenzaEntity> findById(@NonNull Long id) {
        return richiestaAssenzaRepository.findByIdAndTenantId(id, tenantContext.requireTenantId());
    }

    @Override
    public List<RichiestaAssenzaEntity> findAllForTenant() {
        return richiestaAssenzaRepository.findAllByTenantIdOrderByDataInizioDesc(tenantContext.requireTenantId());
    }

    @Override
    public List<RichiestaAssenzaEntity> findAllForDriver(@NonNull Long driverId) {
        return richiestaAssenzaRepository.findAllByTenantIdAndDriverIdOrderByDataInizioDesc(
            tenantContext.requireTenantId(), driverId);
    }

    @Override
    public List<RichiestaAssenzaEntity> findOverlapping(@NonNull Long driverId,
                                                        @NonNull Collection<StatoRichiestaAssenza> statiOccupanti,
                                                        @NonNull LocalDate dataInizio,
                                                        @NonNull LocalDate dataFine) {
        return richiestaAssenzaRepository
            .findAllByDriverIdAndStatoInAndDataInizioLessThanEqualAndDataFineGreaterThanEqual(
                driverId, statiOccupanti, dataFine, dataInizio);
    }
}
