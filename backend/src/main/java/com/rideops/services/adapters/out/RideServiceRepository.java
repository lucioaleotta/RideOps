package com.rideops.services.adapters.out;

import com.rideops.services.domain.ServiceStatus;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RideServiceRepository extends JpaRepository<RideServiceEntity, Long>,
    JpaSpecificationExecutor<RideServiceEntity> {

    List<RideServiceEntity> findAllByOrderByStartAtDesc();

    long countByAssignedDriverIdIsNullAndStatus(ServiceStatus status);

    long countByAssignedDriverIdAndStatusIn(Long assignedDriverId, Collection<ServiceStatus> statuses);

    long countByAssignedVehicleIdAndStartAtGreaterThanEqualAndStartAtLessThanAndStatusIn(
        Long assignedVehicleId,
        LocalDateTime from,
        LocalDateTime to,
        Collection<ServiceStatus> statuses
    );

    long countByAssignedVehicleIdAndStartAtGreaterThanEqualAndStartAtLessThanAndStatusInAndIdNot(
        Long assignedVehicleId,
        LocalDateTime from,
        LocalDateTime to,
        Collection<ServiceStatus> statuses,
        Long id
    );

    @Query(value = """
        SELECT COALESCE(MAX(CAST(split_part(internal_booking_reference, '-', 1) AS INTEGER)), 0)
        FROM ride_service
        WHERE right(internal_booking_reference, 2) = :yearSuffix
          AND internal_booking_reference ~ '^[0-9]+-[0-9]{2}$'
        """, nativeQuery = true)
    int findMaxInternalBookingSequenceForYear(@Param("yearSuffix") String yearSuffix);
}