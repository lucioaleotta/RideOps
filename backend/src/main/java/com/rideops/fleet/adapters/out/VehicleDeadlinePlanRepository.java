package com.rideops.fleet.adapters.out;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VehicleDeadlinePlanRepository extends JpaRepository<VehicleDeadlinePlanEntity, Long> {

    java.util.Optional<VehicleDeadlinePlanEntity> findByIdAndTenantId(Long id, Long tenantId);

    List<VehicleDeadlinePlanEntity> findAllByVehicleIdAndTenantIdOrderByCreatedAtDesc(Long vehicleId, Long tenantId);

    List<VehicleDeadlinePlanEntity> findAllByTenantId(Long tenantId);
}
