package com.rideops.services.adapters.out;

import com.rideops.services.application.ServiceRepositoryPort;
import com.rideops.services.domain.ServiceAssignmentType;
import com.rideops.services.domain.ServiceStatus;
import com.rideops.services.domain.ServiceType;
import com.rideops.multitenancy.TenantContext;
import java.time.LocalDateTime;
import java.util.EnumSet;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Component;

@Component
public class RideServiceJpaAdapter implements ServiceRepositoryPort {

    private final RideServiceRepository rideServiceRepository;
    private final TenantContext tenantContext;

    public RideServiceJpaAdapter(RideServiceRepository rideServiceRepository, TenantContext tenantContext) {
        this.rideServiceRepository = rideServiceRepository;
        this.tenantContext = tenantContext;
    }

    @Override
    public RideServiceEntity save(@NonNull RideServiceEntity entity) {
        if (entity.getTenantId() == null) {
            entity.setTenantId(tenantContext.requireTenantId());
        }
        return rideServiceRepository.save(entity);
    }

    @Override
    public Optional<RideServiceEntity> findById(@NonNull Long id) {
        return rideServiceRepository.findByIdAndTenantId(id, tenantContext.requireTenantId());
    }

    @Override
    public List<RideServiceEntity> findAllByOrderByStartAtDesc() {
        return rideServiceRepository.findAllByTenantIdOrderByStartAtDesc(tenantContext.requireTenantId());
    }

    @Override
    public List<RideServiceEntity> findByFilters(LocalDateTime from,
                                                 LocalDateTime to,
                                                 Long driverId,
                                                 ServiceStatus status,
                                                 ServiceType type) {
        Specification<RideServiceEntity> specification = Specification.where(null);
        Long tenantId = tenantContext.requireTenantId();

        specification = specification.and((root, query, cb) -> cb.equal(root.get("tenantId"), tenantId));

        if (from != null) {
            specification = specification.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("startAt"), from));
        }
        if (to != null) {
            specification = specification.and((root, query, cb) -> cb.lessThan(root.get("startAt"), to));
        }
        if (driverId != null) {
            specification = specification.and((root, query, cb) -> cb.equal(root.get("assignedDriverId"), driverId));
        }
        if (status != null) {
            if (status == ServiceStatus.ASSIGNED) {
                specification = specification.and((root, query, cb) -> cb.and(
                    cb.equal(root.get("status"), ServiceStatus.ASSIGNED),
                    cb.isNotNull(root.get("assignedDriverId")),
                    cb.isNotNull(root.get("assignedByUserId")),
                    cb.isNotNull(root.get("assignedAt"))
                ));
            } else {
                specification = specification.and((root, query, cb) -> cb.equal(root.get("status"), status));
            }
        }
        if (type != null) {
            specification = specification.and((root, query, cb) -> cb.equal(root.get("type"), type));
        }

        return rideServiceRepository.findAll(specification, Sort.by(Sort.Direction.ASC, "startAt"));
    }

    @Override
    public long countUnassignedOpenInternalServices() {
        return rideServiceRepository.countByAssignedDriverIdIsNullAndStatusAndServiceAssignmentTypeNotInAndTenantId(
            ServiceStatus.OPEN,
            EnumSet.of(ServiceAssignmentType.OUTSOURCED, ServiceAssignmentType.INCOMING_OUTSOURCED),
            tenantContext.requireTenantId()
        );
    }

    @Override
    public long countByAssignedDriverIdAndStatusIn(Long driverId, Collection<ServiceStatus> statuses) {
        return rideServiceRepository.countByAssignedDriverIdAndStatusInAndTenantId(driverId, statuses, tenantContext.requireTenantId());
    }

    @Override
    public long countByAssignedVehicleIdAndStartAtGreaterThanEqualAndStartAtLessThanAndStatusIn(
        Long vehicleId,
        LocalDateTime from,
        LocalDateTime to,
        Collection<ServiceStatus> statuses
    ) {
        return rideServiceRepository.countByAssignedVehicleIdAndStartAtGreaterThanEqualAndStartAtLessThanAndStatusInAndTenantId(
            vehicleId,
            from,
            to,
            statuses,
            tenantContext.requireTenantId()
        );
    }

    @Override
    public long countByAssignedVehicleIdAndStartAtGreaterThanEqualAndStartAtLessThanAndStatusInAndIdNot(
        Long vehicleId,
        LocalDateTime from,
        LocalDateTime to,
        Collection<ServiceStatus> statuses,
        Long excludedServiceId
    ) {
        return rideServiceRepository
            .countByAssignedVehicleIdAndStartAtGreaterThanEqualAndStartAtLessThanAndStatusInAndIdNotAndTenantId(
                vehicleId,
                from,
                to,
                statuses,
                excludedServiceId,
                tenantContext.requireTenantId()
            );
    }

    @Override
    public int findMaxInternalBookingSequenceForYear(String yearSuffix) {
        return rideServiceRepository.findMaxInternalBookingSequenceForYear(yearSuffix, tenantContext.requireTenantId());
    }

    @Override
    public void delete(@NonNull RideServiceEntity entity) {
        rideServiceRepository.delete(entity);
    }
}