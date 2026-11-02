package com.rideops.absences.adapters.out;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ConfigurazioneAssenzaDefaultRepository extends JpaRepository<ConfigurazioneAssenzaTenantEntity, Long> {

    List<ConfigurazioneAssenzaTenantEntity> findAllByTenantId(Long tenantId);

    Optional<ConfigurazioneAssenzaTenantEntity> findByTenantIdAndTipoAssenzaId(Long tenantId, Long tipoAssenzaId);

    void deleteByTenantIdAndTipoAssenzaId(Long tenantId, Long tipoAssenzaId);
}
