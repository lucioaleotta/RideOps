package com.rideops.fleet.adapters.out;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VehicleRepository extends JpaRepository<VehicleEntity, Long> {

    java.util.Optional<VehicleEntity> findByIdAndTenantId(Long id, Long tenantId);

    List<VehicleEntity> findAllByTenantIdOrderByPlateAsc(Long tenantId);

    boolean existsByPlateIgnoreCaseAndTenantId(String plate, Long tenantId);

    boolean existsByPlateIgnoreCaseAndIdNotAndTenantId(String plate, Long id, Long tenantId);

    boolean existsByIdAndTenantId(Long id, Long tenantId);
}
