package com.rideops.partners.adapters.out;

import com.rideops.partners.domain.PartnerType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PartnerRepository extends JpaRepository<PartnerEntity, Long> {

  java.util.Optional<PartnerEntity> findByIdAndTenantId(Long id, Long tenantId);

  List<PartnerEntity> findAllByTenantIdOrderByRagioneSocialeAsc(Long tenantId);

  List<PartnerEntity> findAllByTypeAndTenantIdOrderByRagioneSocialeAsc(PartnerType type, Long tenantId);

    boolean existsByRagioneSocialeIgnoreCaseAndDeletedFalseAndTenantId(String ragioneSociale, Long tenantId);

    boolean existsByRagioneSocialeIgnoreCaseAndDeletedFalseAndIdNotAndTenantId(String ragioneSociale,
                                                                                Long id,
                                                                                Long tenantId);
}
