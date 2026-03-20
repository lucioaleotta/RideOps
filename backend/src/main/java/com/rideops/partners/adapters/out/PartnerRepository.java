package com.rideops.partners.adapters.out;

import com.rideops.partners.domain.PartnerType;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PartnerRepository extends JpaRepository<PartnerEntity, Long> {

    @Query("""
        SELECT p FROM PartnerEntity p
        WHERE (:ragioneSociale IS NULL OR LOWER(p.ragioneSociale) LIKE LOWER(CONCAT('%', :ragioneSociale, '%')))
          AND (:type IS NULL OR p.type = :type)
          AND (:includeDeleted = TRUE OR p.deleted = FALSE)
        ORDER BY p.ragioneSociale ASC
        """)
    List<PartnerEntity> search(@Param("ragioneSociale") String ragioneSociale,
                               @Param("type") PartnerType type,
                               @Param("includeDeleted") boolean includeDeleted);

    boolean existsByRagioneSocialeIgnoreCaseAndDeletedFalse(String ragioneSociale);

    boolean existsByRagioneSocialeIgnoreCaseAndDeletedFalseAndIdNot(String ragioneSociale, Long id);
}
