package com.rideops.services.adapters.out;

import com.rideops.services.domain.ServiceStatus;
import com.rideops.services.domain.ServiceAssignmentType;
import java.time.LocalDateTime;
import java.math.BigDecimal;
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

        @Query("""
                SELECT COALESCE(SUM(s.price), 0)
                FROM RideServiceEntity s
                WHERE s.partnerId = :partnerId
                    AND s.serviceAssignmentType = :assignmentType
                """)
        BigDecimal sumPriceByPartnerIdAndAssignmentType(@Param("partnerId") Long partnerId,
                                                                                                        @Param("assignmentType") ServiceAssignmentType assignmentType);

        @Query("""
                SELECT COALESCE(SUM(s.pricePartner), 0)
                FROM RideServiceEntity s
                WHERE s.partnerId = :partnerId
                    AND s.serviceAssignmentType = :assignmentType
                """)
        BigDecimal sumPricePartnerByPartnerIdAndAssignmentType(@Param("partnerId") Long partnerId,
                                                                                                                     @Param("assignmentType") ServiceAssignmentType assignmentType);

        long countByPartnerIdAndServiceAssignmentType(Long partnerId, ServiceAssignmentType serviceAssignmentType);

        @Query("""
                SELECT COALESCE(SUM(s.margin), 0)
                FROM RideServiceEntity s
                WHERE s.partnerId = :partnerId
                    AND s.serviceAssignmentType = :assignmentType
                """)
        BigDecimal sumMarginByPartnerIdAndAssignmentType(@Param("partnerId") Long partnerId,
                                                         @Param("assignmentType") ServiceAssignmentType assignmentType);

        java.util.List<RideServiceEntity> findAllByPartnerIdOrderByStartAtDesc(Long partnerId);

        java.util.List<RideServiceEntity> findAllByServiceAssignmentTypeAndStatusNotOrderByStartAtAsc(
            ServiceAssignmentType serviceAssignmentType,
            ServiceStatus status
        );
}