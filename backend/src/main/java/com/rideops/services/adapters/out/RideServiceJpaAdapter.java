package com.rideops.services.adapters.out;

import com.rideops.services.application.ServiceRepositoryPort;
import com.rideops.services.domain.ServiceStatus;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Component;

@Component
public class RideServiceJpaAdapter implements ServiceRepositoryPort {

    private final RideServiceRepository rideServiceRepository;

    public RideServiceJpaAdapter(RideServiceRepository rideServiceRepository) {
        this.rideServiceRepository = rideServiceRepository;
    }

    @Override
    public RideServiceEntity save(RideServiceEntity entity) {
        return rideServiceRepository.save(entity);
    }

    @Override
    public Optional<RideServiceEntity> findById(Long id) {
        return rideServiceRepository.findById(id);
    }

    @Override
    public List<RideServiceEntity> findAllByOrderByStartAtDesc() {
        return rideServiceRepository.findAllByOrderByStartAtDesc();
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
    public void delete(RideServiceEntity entity) {
        rideServiceRepository.delete(entity);
    }
}