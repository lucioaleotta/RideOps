package com.rideops.fleet.adapters.out;

import com.rideops.fleet.domain.DeadlineStatus;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VehicleDeadlineRepository extends JpaRepository<VehicleDeadlineEntity, Long> {

    java.util.Optional<VehicleDeadlineEntity> findByIdAndTenantId(Long id, Long tenantId);

    List<VehicleDeadlineEntity> findAllByVehicleIdAndTenantIdOrderByDueDateAsc(Long vehicleId, Long tenantId);

    List<VehicleDeadlineEntity> findAllByStatusNotInAndDueDateLessThanEqualAndTenantIdOrderByDueDateAsc(
        List<DeadlineStatus> excludedStatuses,
        LocalDate dueDate,
        Long tenantId
    );

    List<VehicleDeadlineEntity> findAllByStatusNotInAndDueDateLessThanAndTenantIdOrderByDueDateAsc(
        List<DeadlineStatus> excludedStatuses,
        LocalDate dueDate,
        Long tenantId
    );
}
