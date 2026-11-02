package com.rideops.services.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

import com.rideops.services.adapters.out.RideServiceEntity;
import com.rideops.services.domain.ServiceStatus;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class DriverScheduleConflictServiceTest {

    @Mock private ServiceRepositoryPort serviceRepositoryPort;

    private DriverScheduleConflictService service;
    private RideServiceEntity ride;

    @BeforeEach
    void setUp() {
        service = new DriverScheduleConflictService(serviceRepositoryPort);
        ride = new RideServiceEntity();
        ride.setStartAt(LocalDateTime.of(2026, 10, 5, 9, 0));
        ride.setDurationHours(2);
        ride.setPickupLocation("Centro");
        ride.setDestination("Aeroporto");
        when(serviceRepositoryPort.findByFilters(
            LocalDate.of(2026, 10, 5).minusDays(1).atStartOfDay(),
            LocalDate.of(2026, 10, 5).plusDays(1).atStartOfDay(),
            12L, ServiceStatus.ASSIGNED, null)).thenReturn(List.of(ride));
    }

    @Test
    void detectsAssignedServiceOverlappingRequestedWindow() {
        List<DriverServiceConflict> conflicts = service.findConflicts(
            12L, LocalDate.of(2026, 10, 5), LocalDate.of(2026, 10, 5), false,
            LocalTime.of(10, 0), LocalTime.of(12, 0));

        assertEquals(1, conflicts.size());
        assertEquals("Aeroporto", conflicts.get(0).destination());
    }

    @Test
    void ignoresAssignedServiceOutsideRequestedHours() {
        List<DriverServiceConflict> conflicts = service.findConflicts(
            12L, LocalDate.of(2026, 10, 5), LocalDate.of(2026, 10, 5), false,
            LocalTime.of(12, 0), LocalTime.of(14, 0));

        assertEquals(0, conflicts.size());
    }
}
