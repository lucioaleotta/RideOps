package com.rideops.fleet.adapters.out;

import java.time.LocalDate;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface VehicleUnavailabilityRepository extends JpaRepository<VehicleUnavailabilityEntity, Long> {

    java.util.Optional<VehicleUnavailabilityEntity> findByIdAndTenantId(Long id, Long tenantId);

    List<VehicleUnavailabilityEntity> findAllByVehicleIdAndTenantIdOrderByStartDateAsc(Long vehicleId, Long tenantId);

    boolean existsByVehicleIdAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndTenantId(Long vehicleId,
                                                                                             LocalDate endDate,
                                                                                             LocalDate startDate,
                                                                                             Long tenantId);

    boolean existsByVehicleIdAndIdNotAndStartDateLessThanEqualAndEndDateGreaterThanEqualAndTenantId(Long vehicleId,
                                                                                                      Long id,
                                                                                                      LocalDate endDate,
                                                                                                      LocalDate startDate,
                                                                                                      Long tenantId);
}
