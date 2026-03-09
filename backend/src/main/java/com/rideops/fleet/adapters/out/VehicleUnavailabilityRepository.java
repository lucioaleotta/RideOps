package com.rideops.fleet.adapters.out;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VehicleUnavailabilityRepository extends JpaRepository<VehicleUnavailabilityEntity, Long> {

    List<VehicleUnavailabilityEntity> findAllByVehicleIdOrderByStartDateAsc(Long vehicleId);

    boolean existsByVehicleIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(Long vehicleId,
                                                                                  LocalDate endDate,
                                                                                  LocalDate startDate);

    boolean existsByVehicleIdAndIdNotAndStartDateLessThanEqualAndEndDateGreaterThanEqual(Long vehicleId,
                                                                                           Long id,
                                                                                           LocalDate endDate,
                                                                                           LocalDate startDate);
}
