package com.rideops.fleet.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.rideops.fleet.adapters.out.VehicleDeadlineEntity;
import com.rideops.fleet.adapters.out.VehicleDeadlineRepository;
import com.rideops.fleet.adapters.out.VehicleEntity;
import com.rideops.fleet.adapters.out.VehicleRepository;
import com.rideops.fleet.adapters.out.VehicleUnavailabilityRepository;
import com.rideops.fleet.domain.DeadlineStatus;
import com.rideops.fleet.domain.DeadlineType;
import com.rideops.fleet.domain.VehicleType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class FleetServiceTest {

    @Mock
    private VehicleRepository vehicleRepository;

    @Mock
    private VehicleDeadlineRepository vehicleDeadlineRepository;

    @Mock
    private VehicleUnavailabilityRepository vehicleUnavailabilityRepository;

    private FleetService fleetService;

    @BeforeEach
    void setUp() {
        fleetService = new FleetService(vehicleRepository, vehicleDeadlineRepository, vehicleUnavailabilityRepository);
    }

    @Test
    void createUnavailabilityRejectsOverlappingRange() {
        VehicleEntity vehicle = vehicleEntity(10L);

        when(vehicleRepository.findById(10L)).thenReturn(Optional.of(vehicle));
        when(vehicleUnavailabilityRepository.existsByVehicleIdAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            10L,
            LocalDate.of(2026, 3, 20),
            LocalDate.of(2026, 3, 10)
        )).thenReturn(true);

        assertThrows(
            FleetValidationException.class,
            () -> fleetService.createUnavailability(
                10L,
                LocalDate.of(2026, 3, 10),
                LocalDate.of(2026, 3, 20),
                "Manutenzione"
            )
        );

        verify(vehicleUnavailabilityRepository, never()).save(any());
    }

    @Test
    void createUnavailabilityRejectsInvalidDateOrder() {
        assertThrows(
            FleetValidationException.class,
            () -> fleetService.createUnavailability(
                10L,
                LocalDate.of(2026, 3, 20),
                LocalDate.of(2026, 3, 10),
                "Manutenzione"
            )
        );
    }

    @Test
    void createVehicleNormalizesPlateAndValidatesSeats() {
        VehicleEntity saved = vehicleEntity(99L);
        saved.setPlate("AB123CD");
        saved.setSeats(7);
        saved.setType(VehicleType.VAN);

        when(vehicleRepository.existsByPlateIgnoreCase("AB123CD")).thenReturn(false);
        when(vehicleRepository.save(any(VehicleEntity.class))).thenReturn(saved);

        VehicleDto dto = fleetService.createVehicle(" ab123cd ", 7, VehicleType.VAN, null);

        assertEquals("AB123CD", dto.plate());
        assertEquals(7, dto.seats());
    }

    @Test
    void createDeadlineRejectsPagataForRevisione() {
        when(vehicleRepository.findById(10L)).thenReturn(Optional.of(vehicleEntity(10L)));

        assertThrows(
            FleetValidationException.class,
            () -> fleetService.createDeadline(
                10L,
                DeadlineType.REVISIONE,
                "Revisione annuale",
                null,
                LocalDate.of(2026, 5, 1),
                DeadlineStatus.PAGATA,
                BigDecimal.valueOf(120),
                "EUR",
                null,
                LocalDate.of(2026, 4, 20),
                null
            )
        );
    }

    @Test
    void createDeadlineRejectsEseguitaWithoutExecutionDate() {
        when(vehicleRepository.findById(10L)).thenReturn(Optional.of(vehicleEntity(10L)));

        assertThrows(
            FleetValidationException.class,
            () -> fleetService.createDeadline(
                10L,
                DeadlineType.TAGLIANDO,
                "Tagliando 30k",
                null,
                LocalDate.of(2026, 5, 1),
                DeadlineStatus.ESEGUITA,
                BigDecimal.valueOf(220),
                "EUR",
                null,
                null,
                null
            )
        );
    }

    @Test
    void createDeadlineAcceptsPagataForAssicurazioneWithPaymentDate() {
        VehicleEntity vehicle = vehicleEntity(10L);
        VehicleDeadlineEntity saved = new VehicleDeadlineEntity();
        saved.setVehicle(vehicle);
        saved.setType(DeadlineType.ASSICURAZIONE);
        saved.setTitle("Rinnovo assicurazione");
        saved.setDueDate(LocalDate.of(2026, 8, 1));
        saved.setStatus(DeadlineStatus.PAGATA);
        saved.setCostAmount(BigDecimal.valueOf(900));
        saved.setCurrency("EUR");
        saved.setPaymentDate(LocalDate.of(2026, 7, 20));

        when(vehicleRepository.findById(10L)).thenReturn(Optional.of(vehicle));
        when(vehicleDeadlineRepository.save(any(VehicleDeadlineEntity.class))).thenReturn(saved);

        VehicleDeadlineDto dto = fleetService.createDeadline(
            10L,
            DeadlineType.ASSICURAZIONE,
            "Rinnovo assicurazione",
            "Polizza annuale",
            LocalDate.of(2026, 8, 1),
            DeadlineStatus.PAGATA,
            BigDecimal.valueOf(900),
            "EUR",
            "pagata in anticipo",
            LocalDate.of(2026, 7, 20),
            null
        );

        assertEquals(DeadlineStatus.PAGATA, dto.status());
        assertEquals("EUR", dto.currency());
        verify(vehicleDeadlineRepository, times(1)).save(any(VehicleDeadlineEntity.class));
    }

    private VehicleEntity vehicleEntity(Long id) {
        VehicleEntity vehicle = new VehicleEntity();
        vehicle.setPlate("AA111AA");
        vehicle.setSeats(4);
        vehicle.setType(VehicleType.SEDAN);

        try {
            var field = VehicleEntity.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(vehicle, id);
        } catch (ReflectiveOperationException exception) {
            throw new IllegalStateException(exception);
        }

        return vehicle;
    }
}
