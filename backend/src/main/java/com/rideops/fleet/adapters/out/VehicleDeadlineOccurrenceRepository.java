package com.rideops.fleet.adapters.out;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VehicleDeadlineOccurrenceRepository extends JpaRepository<VehicleDeadlineOccurrenceEntity, Long> {

    java.util.Optional<VehicleDeadlineOccurrenceEntity> findByIdAndTenantId(Long id, Long tenantId);

    List<VehicleDeadlineOccurrenceEntity> findAllByVehicleIdAndTenantIdOrderByDueDateDesc(Long vehicleId, Long tenantId);

    boolean existsByPlanIdAndDueDateAndTenantId(Long planId, java.time.LocalDate dueDate, Long tenantId);
}
