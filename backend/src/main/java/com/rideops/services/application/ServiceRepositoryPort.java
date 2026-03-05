package com.rideops.services.application;

import com.rideops.services.adapters.out.RideServiceEntity;
import java.util.List;
import java.util.Optional;

public interface ServiceRepositoryPort {

    RideServiceEntity save(RideServiceEntity entity);

    Optional<RideServiceEntity> findById(Long id);

    List<RideServiceEntity> findAllByOrderByStartAtDesc();

    void delete(RideServiceEntity entity);
}