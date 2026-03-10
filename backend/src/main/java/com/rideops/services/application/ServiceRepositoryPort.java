package com.rideops.services.application;

import com.rideops.services.adapters.out.RideServiceEntity;
import com.rideops.services.domain.ServiceStatus;
import com.rideops.services.domain.ServiceType;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.lang.NonNull;

public interface ServiceRepositoryPort {

    RideServiceEntity save(@NonNull RideServiceEntity entity);

    Optional<RideServiceEntity> findById(@NonNull Long id);

    List<RideServiceEntity> findAllByOrderByStartAtDesc();

    List<RideServiceEntity> findByFilters(LocalDateTime from,
                                          LocalDateTime to,
                                          Long driverId,
                                          ServiceStatus status,
                                          ServiceType type);

    long countByAssignedDriverIdIsNullAndStatus(ServiceStatus status);

    long countByAssignedDriverIdAndStatusIn(Long driverId, Collection<ServiceStatus> statuses);

    long countByAssignedVehicleIdAndStartAtGreaterThanEqualAndStartAtLessThanAndStatusIn(
        Long vehicleId,
        LocalDateTime from,
        LocalDateTime to,
        Collection<ServiceStatus> statuses
    );

    long countByAssignedVehicleIdAndStartAtGreaterThanEqualAndStartAtLessThanAndStatusInAndIdNot(
        Long vehicleId,
        LocalDateTime from,
        LocalDateTime to,
        Collection<ServiceStatus> statuses,
        Long excludedServiceId
    );

    void delete(@NonNull RideServiceEntity entity);
}