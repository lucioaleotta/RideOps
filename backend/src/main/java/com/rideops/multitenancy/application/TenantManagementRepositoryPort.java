package com.rideops.multitenancy.application;

import com.rideops.multitenancy.TenantEntity;
import java.util.List;
import java.util.Optional;

public interface TenantManagementRepositoryPort {

    boolean existsByBusinessNameIgnoreCase(String businessName);

    boolean existsByContactEmailIgnoreCase(String contactEmail);

    boolean existsByBusinessNameIgnoreCaseAndIdNot(String businessName, Long id);

    boolean existsByContactEmailIgnoreCaseAndIdNot(String contactEmail, Long id);

    TenantEntity save(TenantEntity tenant);

    Optional<TenantEntity> findById(Long id);

    List<TenantEntity> findAllByOrderByBusinessNameAsc();

    List<TenantEntity> search(String query);
}
