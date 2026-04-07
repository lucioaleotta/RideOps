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

    java.util.Optional<RideServiceEntity> findByIdAndTenantId(Long id, Long tenantId);

    List<RideServiceEntity> findAllByTenantIdOrderByStartAtDesc(Long tenantId);

    long countByAssignedDriverIdIsNullAndStatusAndTenantId(ServiceStatus status, Long tenantId);

    long countByAssignedDriverIdAndStatusInAndTenantId(Long assignedDriverId, Collection<ServiceStatus> statuses, Long tenantId);

    long countByAssignedVehicleIdAndStartAtGreaterThanEqualAndStartAtLessThanAndStatusInAndTenantId(
        Long assignedVehicleId,
        LocalDateTime from,
        LocalDateTime to,
        Collection<ServiceStatus> statuses,
        Long tenantId
    );

    long countByAssignedVehicleIdAndStartAtGreaterThanEqualAndStartAtLessThanAndStatusInAndIdNotAndTenantId(
        Long assignedVehicleId,
        LocalDateTime from,
        LocalDateTime to,
        Collection<ServiceStatus> statuses,
        Long id,
        Long tenantId
    );

    @Query(value = """
        SELECT COALESCE(MAX(CAST(split_part(internal_booking_reference, '-', 1) AS INTEGER)), 0)
        FROM ride_service
        WHERE right(internal_booking_reference, 2) = :yearSuffix
                    AND tenant_id = :tenantId
          AND internal_booking_reference ~ '^[0-9]+-[0-9]{2}$'
        """, nativeQuery = true)
        int findMaxInternalBookingSequenceForYear(@Param("yearSuffix") String yearSuffix, @Param("tenantId") Long tenantId);

        @Query("""
                SELECT COALESCE(SUM(s.price), 0)
                FROM RideServiceEntity s
                WHERE s.partnerId = :partnerId
                    AND s.tenantId = :tenantId
                    AND s.serviceAssignmentType = :assignmentType
                """)
        BigDecimal sumPriceByPartnerIdAndAssignmentType(@Param("partnerId") Long partnerId,
                                                        @Param("assignmentType") ServiceAssignmentType assignmentType,
                                                        @Param("tenantId") Long tenantId);

        @Query("""
                SELECT COALESCE(SUM(s.pricePartner), 0)
                FROM RideServiceEntity s
                WHERE s.partnerId = :partnerId
                    AND s.tenantId = :tenantId
                    AND s.serviceAssignmentType = :assignmentType
                """)
        BigDecimal sumPricePartnerByPartnerIdAndAssignmentType(@Param("partnerId") Long partnerId,
                                                               @Param("assignmentType") ServiceAssignmentType assignmentType,
                                                               @Param("tenantId") Long tenantId);

        long countByPartnerIdAndServiceAssignmentTypeAndTenantId(Long partnerId,
                                                                 ServiceAssignmentType serviceAssignmentType,
                                                                 Long tenantId);

        @Query("""
                SELECT COALESCE(SUM(s.margin), 0)
                FROM RideServiceEntity s
                WHERE s.partnerId = :partnerId
                    AND s.tenantId = :tenantId
                    AND s.serviceAssignmentType = :assignmentType
                """)
        BigDecimal sumMarginByPartnerIdAndAssignmentType(@Param("partnerId") Long partnerId,
                                                         @Param("assignmentType") ServiceAssignmentType assignmentType,
                                                         @Param("tenantId") Long tenantId);

        java.util.List<RideServiceEntity> findAllByPartnerIdAndTenantIdOrderByStartAtDesc(Long partnerId, Long tenantId);

        java.util.List<RideServiceEntity> findAllByServiceAssignmentTypeAndStatusNotAndTenantIdOrderByStartAtAsc(
            ServiceAssignmentType serviceAssignmentType,
            ServiceStatus status,
            Long tenantId
        );
}