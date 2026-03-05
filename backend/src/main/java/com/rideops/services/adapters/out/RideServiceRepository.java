package com.rideops.services.adapters.out;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface RideServiceRepository extends JpaRepository<RideServiceEntity, Long> {

    List<RideServiceEntity> findAllByOrderByStartAtDesc();
}