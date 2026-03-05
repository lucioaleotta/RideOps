package com.rideops.services.adapters.out;

import com.rideops.services.domain.ServiceStatus;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RideServiceRepository extends JpaRepository<RideServiceEntity, Long> {

    List<RideServiceEntity> findAllByOrderByStartAtDesc();

    List<RideServiceEntity> findAllByAssignedDriverIdAndStartAtBetweenOrderByStartAtAsc(Long assignedDriverId,
                                                                                           LocalDateTime from,
                                                                                           LocalDateTime to);

    List<RideServiceEntity> findAllByAssignedDriverIdAndStartAtGreaterThanOrderByStartAtAsc(Long assignedDriverId,
                                                                                               LocalDateTime fromExclusive);

    long countByAssignedDriverIdIsNullAndStatus(ServiceStatus status);
}