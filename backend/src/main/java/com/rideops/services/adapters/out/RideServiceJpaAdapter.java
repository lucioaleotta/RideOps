package com.rideops.services.adapters.out;

import com.rideops.services.application.ServiceRepositoryPort;
import com.rideops.services.domain.ServiceStatus;
import com.rideops.services.domain.ServiceType;
import java.time.LocalDateTime;
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

    public RideServiceJpaAdapter(RideServiceRepository rideServiceRepository) {
        this.rideServiceRepository = rideServiceRepository;
    }

    @Override
    public RideServiceEntity save(@NonNull RideServiceEntity entity) {
        return rideServiceRepository.save(entity);
    }

    @Override
    public Optional<RideServiceEntity> findById(@NonNull Long id) {
        return rideServiceRepository.findById(id);
    }

    @Override
    public List<RideServiceEntity> findAllByOrderByStartAtDesc() {
        return rideServiceRepository.findAllByOrderByStartAtDesc();
    }

    @Override
    public List<RideServiceEntity> findByFilters(LocalDateTime from,
                                                 LocalDateTime to,
                                                 Long driverId,
                                                 ServiceStatus status,
                                                 ServiceType type) {
        Specification<RideServiceEntity> specification = Specification.where(null);

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
    public List<RideServiceEntity> findAllByAssignedDriverIdAndStartAtBetweenOrderByStartAtAsc(Long driverId,
                                                                                                  LocalDateTime from,
                                                                                                  LocalDateTime to) {
        return rideServiceRepository.findAllByAssignedDriverIdAndStartAtBetweenOrderByStartAtAsc(driverId, from, to);
    }

    @Override
    public List<RideServiceEntity> findAllByAssignedDriverIdAndStartAtGreaterThanOrderByStartAtAsc(Long driverId,
                                                                                                       LocalDateTime fromExclusive) {
        return rideServiceRepository.findAllByAssignedDriverIdAndStartAtGreaterThanOrderByStartAtAsc(driverId, fromExclusive);
    }

    @Override
    public long countByAssignedDriverIdIsNullAndStatus(ServiceStatus status) {
        return rideServiceRepository.countByAssignedDriverIdIsNullAndStatus(status);
    }

    @Override
    public long countByAssignedDriverIdAndStatusIn(Long driverId, Collection<ServiceStatus> statuses) {
        return rideServiceRepository.countByAssignedDriverIdAndStatusIn(driverId, statuses);
    }

    @Override
    public long countByAssignedVehicleIdAndStartAtGreaterThanEqualAndStartAtLessThanAndStatusIn(
        Long vehicleId,
        LocalDateTime from,
        LocalDateTime to,
        Collection<ServiceStatus> statuses
    ) {
        return rideServiceRepository.countByAssignedVehicleIdAndStartAtGreaterThanEqualAndStartAtLessThanAndStatusIn(
            vehicleId,
            from,
            to,
            statuses
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
            .countByAssignedVehicleIdAndStartAtGreaterThanEqualAndStartAtLessThanAndStatusInAndIdNot(
                vehicleId,
                from,
                to,
                statuses,
                excludedServiceId
            );
    }

    @Override
    public void delete(@NonNull RideServiceEntity entity) {
        rideServiceRepository.delete(entity);
    }
}