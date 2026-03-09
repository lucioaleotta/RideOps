package com.rideops.services.adapters.out;

import com.rideops.services.domain.ServiceStatus;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface RideServiceRepository extends JpaRepository<RideServiceEntity, Long>,
    JpaSpecificationExecutor<RideServiceEntity> {

    List<RideServiceEntity> findAllByOrderByStartAtDesc();

    List<RideServiceEntity> findAllByAssignedDriverIdAndStartAtBetweenOrderByStartAtAsc(Long assignedDriverId,
                                                                                           LocalDateTime from,
                                                                                           LocalDateTime to);

    List<RideServiceEntity> findAllByAssignedDriverIdAndStartAtGreaterThanOrderByStartAtAsc(Long assignedDriverId,
                                                                                               LocalDateTime fromExclusive);

    long countByAssignedDriverIdIsNullAndStatus(ServiceStatus status);

    long countByAssignedDriverIdAndStatusIn(Long assignedDriverId, Collection<ServiceStatus> statuses);
}