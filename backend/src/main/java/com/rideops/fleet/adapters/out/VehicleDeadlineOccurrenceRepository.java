package com.rideops.fleet.adapters.out;

import com.rideops.fleet.domain.DeadlineStatus;
import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VehicleDeadlineOccurrenceRepository extends JpaRepository<VehicleDeadlineOccurrenceEntity, Long> {

    java.util.Optional<VehicleDeadlineOccurrenceEntity> findByIdAndTenantId(Long id, Long tenantId);

    List<VehicleDeadlineOccurrenceEntity> findAllByVehicleIdAndTenantIdOrderByDueDateDesc(Long vehicleId, Long tenantId);

    boolean existsByPlanIdAndDueDateAndTenantId(Long planId, java.time.LocalDate dueDate, Long tenantId);

    long countByTenantIdAndStatusNotInAndDueDateGreaterThanEqualAndDueDateLessThanEqual(
        Long tenantId,
        Collection<DeadlineStatus> excludedStatuses,
        LocalDate from,
        LocalDate to
    );

    long countByTenantIdAndStatusNotInAndDueDateLessThan(
        Long tenantId,
        Collection<DeadlineStatus> excludedStatuses,
        LocalDate before
    );
}
