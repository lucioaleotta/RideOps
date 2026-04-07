package com.rideops.multitenancy;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface TenantRepository extends JpaRepository<TenantEntity, Long> {

    Optional<TenantEntity> findByBusinessNameIgnoreCase(String businessName);

    boolean existsByBusinessNameIgnoreCase(String businessName);

    boolean existsByContactEmailIgnoreCase(String contactEmail);

    boolean existsByBusinessNameIgnoreCaseAndIdNot(String businessName, Long id);

    boolean existsByContactEmailIgnoreCaseAndIdNot(String contactEmail, Long id);

    List<TenantEntity> findAllByOrderByBusinessNameAsc();

    List<TenantEntity> findByBusinessNameContainingIgnoreCaseOrContactEmailContainingIgnoreCaseOrderByBusinessNameAsc(
        String businessName,
        String contactEmail
    );
}
