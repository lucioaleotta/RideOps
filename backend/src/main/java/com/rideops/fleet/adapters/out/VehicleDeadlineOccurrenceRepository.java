package com.rideops.fleet.adapters.out;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VehicleDeadlineOccurrenceRepository extends JpaRepository<VehicleDeadlineOccurrenceEntity, Long> {

    List<VehicleDeadlineOccurrenceEntity> findAllByVehicleIdOrderByDueDateDesc(Long vehicleId);

    boolean existsByPlanIdAndDueDate(Long planId, java.time.LocalDate dueDate);
}
