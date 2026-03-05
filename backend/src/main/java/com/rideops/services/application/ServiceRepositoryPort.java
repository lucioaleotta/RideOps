package com.rideops.services.application;

import com.rideops.services.adapters.out.RideServiceEntity;
import com.rideops.services.domain.ServiceStatus;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ServiceRepositoryPort {

    RideServiceEntity save(RideServiceEntity entity);

    Optional<RideServiceEntity> findById(Long id);

    List<RideServiceEntity> findAllByOrderByStartAtDesc();

    List<RideServiceEntity> findAllByAssignedDriverIdAndStartAtBetweenOrderByStartAtAsc(Long driverId,
                                                                                          LocalDateTime from,
                                                                                          LocalDateTime to);

    List<RideServiceEntity> findAllByAssignedDriverIdAndStartAtGreaterThanOrderByStartAtAsc(Long driverId,
                                                                                               LocalDateTime fromExclusive);

    long countByAssignedDriverIdIsNullAndStatus(ServiceStatus status);

    void delete(RideServiceEntity entity);
}