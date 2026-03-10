package com.rideops.fleet.adapters.out;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VehicleRepository extends JpaRepository<VehicleEntity, Long> {

    List<VehicleEntity> findAllByOrderByPlateAsc();

    boolean existsByPlateIgnoreCase(String plate);

    boolean existsByPlateIgnoreCaseAndIdNot(String plate, Long id);
}
