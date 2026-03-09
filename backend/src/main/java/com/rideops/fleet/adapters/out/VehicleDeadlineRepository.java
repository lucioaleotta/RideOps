package com.rideops.fleet.adapters.out;

import com.rideops.fleet.domain.DeadlineStatus;
import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VehicleDeadlineRepository extends JpaRepository<VehicleDeadlineEntity, Long> {

    List<VehicleDeadlineEntity> findAllByVehicleIdOrderByDueDateAsc(Long vehicleId);

    List<VehicleDeadlineEntity> findAllByStatusNotInAndDueDateLessThanEqualOrderByDueDateAsc(List<DeadlineStatus> excludedStatuses,
                                                                                               LocalDate dueDate);

    List<VehicleDeadlineEntity> findAllByStatusNotInAndDueDateLessThanOrderByDueDateAsc(List<DeadlineStatus> excludedStatuses,
                                                                                          LocalDate dueDate);
}
