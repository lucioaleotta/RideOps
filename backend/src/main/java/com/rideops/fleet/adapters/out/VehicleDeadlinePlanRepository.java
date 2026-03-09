package com.rideops.fleet.adapters.out;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VehicleDeadlinePlanRepository extends JpaRepository<VehicleDeadlinePlanEntity, Long> {

    List<VehicleDeadlinePlanEntity> findAllByVehicleIdOrderByCreatedAtDesc(Long vehicleId);
}
