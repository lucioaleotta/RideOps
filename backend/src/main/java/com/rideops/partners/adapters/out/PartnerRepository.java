package com.rideops.partners.adapters.out;

import com.rideops.partners.domain.PartnerType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PartnerRepository extends JpaRepository<PartnerEntity, Long> {

  List<PartnerEntity> findAllByOrderByRagioneSocialeAsc();

  List<PartnerEntity> findAllByTypeOrderByRagioneSocialeAsc(PartnerType type);

    boolean existsByRagioneSocialeIgnoreCaseAndDeletedFalse(String ragioneSociale);

    boolean existsByRagioneSocialeIgnoreCaseAndDeletedFalseAndIdNot(String ragioneSociale, Long id);
}
