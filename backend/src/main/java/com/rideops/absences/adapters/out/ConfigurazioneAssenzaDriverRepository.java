package com.rideops.absences.adapters.out;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConfigurazioneAssenzaDriverRepository extends JpaRepository<ConfigurazioneAssenzaDriverEntity, Long> {

    List<ConfigurazioneAssenzaDriverEntity> findAllByTenantIdAndTipoAssenzaId(Long tenantId, Long tipoAssenzaId);

    Optional<ConfigurazioneAssenzaDriverEntity> findByTenantIdAndDriverIdAndTipoAssenzaId(
        Long tenantId, Long driverId, Long tipoAssenzaId);

    void deleteByTenantIdAndDriverIdAndTipoAssenzaId(Long tenantId, Long driverId, Long tipoAssenzaId);

    void deleteAllByTenantIdAndDriverIdInAndTipoAssenzaId(Long tenantId, List<Long> driverIds, Long tipoAssenzaId);
}