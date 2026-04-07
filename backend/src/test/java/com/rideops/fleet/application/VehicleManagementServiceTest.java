package com.rideops.fleet.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.rideops.fleet.adapters.out.VehicleDeadlineOccurrenceEntity;
import com.rideops.fleet.adapters.out.VehicleDeadlineOccurrenceRepository;
import com.rideops.fleet.adapters.out.VehicleDeadlinePlanEntity;
import com.rideops.fleet.adapters.out.VehicleDeadlinePlanRepository;
import com.rideops.fleet.adapters.out.VehicleEntity;
import com.rideops.fleet.adapters.out.VehicleRepository;
import com.rideops.fleet.domain.DeadlineStatus;
import com.rideops.fleet.domain.DeadlineType;
import com.rideops.fleet.domain.VehicleType;
import com.rideops.identity.adapters.out.UserEntity;
import com.rideops.identity.application.IdentityUserDetails;
import com.rideops.identity.domain.UserRole;
import com.rideops.multitenancy.TenantContext;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class VehicleManagementServiceTest {

    @Mock
    private VehicleRepository vehicleRepository;

    @Mock
    private VehicleDeadlineOccurrenceRepository occurrenceRepository;

    @Mock
    private VehicleDeadlinePlanRepository planRepository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    private VehicleManagementService service;

    @BeforeEach
    void setUp() {
        applyTenantAuthentication(1L);
        service = new VehicleManagementService(
            vehicleRepository,
            occurrenceRepository,
            planRepository,
            eventPublisher,
            new TenantContext()
        );
    }

    private void applyTenantAuthentication(Long tenantId) {
        UserEntity user = new UserEntity();
        user.setUserId("tester");
        user.setEmail("tester@rideops.local");
        user.setPasswordHash("hash");
        user.setRole(UserRole.ADMIN);
        user.setEnabled(true);
        user.setTenantId(tenantId);

        IdentityUserDetails principal = new IdentityUserDetails(user);
        SecurityContextHolder.getContext().setAuthentication(
            new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities())
        );
    }

    @Test
    void addOccurrenceRejectsPagataForRevisione() {
        when(vehicleRepository.findByIdAndTenantId(10L, 1L)).thenReturn(Optional.of(vehicle(10L)));

        assertThrows(
            FleetValidationException.class,
            () -> service.addOccurrence(
                10L,
                null,
                DeadlineType.REVISIONE,
                "Revisione",
                null,
                LocalDate.of(2026, 6, 1),
                DeadlineStatus.PAGATA,
                BigDecimal.valueOf(100),
                "EUR",
                null,
                LocalDate.of(2026, 5, 20),
                null
            )
        );
    }

    @Test
    void markOccurrencePaidWorksForBollo() {
        VehicleEntity vehicle = vehicle(10L);
        VehicleDeadlineOccurrenceEntity occurrence = occurrence(vehicle, 1L, DeadlineType.BOLLO);
        VehicleDeadlinePlanEntity plan = plan(vehicle, 21L);
        plan.setActive(true);
        occurrence.setPlan(plan);
        occurrence.setDueDate(LocalDate.of(2026, 4, 1));

        when(occurrenceRepository.findByIdAndTenantId(1L, 1L)).thenReturn(Optional.of(occurrence));
        when(occurrenceRepository.save(any(VehicleDeadlineOccurrenceEntity.class))).thenReturn(occurrence);
        when(occurrenceRepository.existsByPlanIdAndDueDateAndTenantId(21L, LocalDate.of(2027, 4, 1), 1L)).thenReturn(false);

        VehicleDeadlineOccurrenceDto dto = service.markOccurrencePaid(1L, LocalDate.of(2026, 4, 1));

        assertEquals(DeadlineStatus.PAGATA, dto.status());
        verify(occurrenceRepository, times(2)).save(any(VehicleDeadlineOccurrenceEntity.class));
    }

    @Test
    void addPlanCreatesFirstOccurrenceAutomatically() {
        VehicleEntity vehicle = vehicle(10L);
        VehicleDeadlinePlanEntity plan = plan(vehicle, 30L);
        plan.setNextDueDate(LocalDate.of(2026, 9, 1));

        when(vehicleRepository.findByIdAndTenantId(10L, 1L)).thenReturn(Optional.of(vehicle));
        when(planRepository.save(any(VehicleDeadlinePlanEntity.class))).thenReturn(plan);
        when(occurrenceRepository.existsByPlanIdAndDueDateAndTenantId(30L, LocalDate.of(2026, 9, 1), 1L)).thenReturn(false);

        VehicleDeadlinePlanDto dto = service.addPlan(
            10L,
            DeadlineType.BOLLO,
            "Piano bollo",
            null,
            12,
            LocalDate.of(2026, 9, 1),
            BigDecimal.valueOf(200),
            "EUR",
            null
        );

        assertEquals(30L, dto.id());
        verify(occurrenceRepository, times(1)).save(any(VehicleDeadlineOccurrenceEntity.class));
    }

    @Test
    void togglePlanActiveState() {
        VehicleDeadlinePlanEntity plan = plan(vehicle(7L), 3L);
        plan.setActive(true);

        when(planRepository.findByIdAndTenantId(3L, 1L)).thenReturn(Optional.of(plan));
        when(planRepository.save(any(VehicleDeadlinePlanEntity.class))).thenReturn(plan);

        VehicleDeadlinePlanDto off = service.deactivatePlan(3L);
        assertEquals(false, off.active());

        VehicleDeadlinePlanDto on = service.reactivatePlan(3L);
        assertEquals(true, on.active());
    }

    @Test
    void getVehicleDetailComputesUpcomingAndOverdue() {
        VehicleEntity vehicle = vehicle(9L);
        VehicleDeadlineOccurrenceEntity upcoming = occurrence(vehicle, 11L, DeadlineType.BOLLO);
        upcoming.setTitle("Bollo");
        upcoming.setStatus(DeadlineStatus.DA_ESEGUIRE);
        upcoming.setDueDate(LocalDate.now().plusDays(3));
        upcoming.setCostAmount(BigDecimal.TEN);
        upcoming.setCurrency("EUR");

        VehicleDeadlineOccurrenceEntity overdue = occurrence(vehicle, 12L, DeadlineType.BOLLO);
        overdue.setTitle("Bollo vecchio");
        overdue.setStatus(DeadlineStatus.DA_ESEGUIRE);
        overdue.setDueDate(LocalDate.now().minusDays(2));
        overdue.setCostAmount(BigDecimal.ONE);
        overdue.setCurrency("EUR");

        when(vehicleRepository.findByIdAndTenantId(9L, 1L)).thenReturn(Optional.of(vehicle));
        when(occurrenceRepository.findAllByVehicleIdAndTenantIdOrderByDueDateDesc(9L, 1L)).thenReturn(List.of(upcoming, overdue));
        when(planRepository.findAllByVehicleIdAndTenantIdOrderByCreatedAtDesc(9L, 1L)).thenReturn(List.of());

        VehicleDetailDto dto = service.getVehicleDetail(9L, 30);

        assertEquals(1, dto.upcomingCount());
        assertEquals(1, dto.overdueCount());
    }

    @Test
    void syncMissingOccurrencesCreatesOnlyMissingOnActivePlans() {
        VehicleEntity vehicle = vehicle(50L);

        VehicleDeadlinePlanEntity activeMissing = plan(vehicle, 100L);
        activeMissing.setActive(true);
        activeMissing.setNextDueDate(LocalDate.of(2026, 10, 1));

        VehicleDeadlinePlanEntity activePresent = plan(vehicle, 101L);
        activePresent.setActive(true);
        activePresent.setNextDueDate(LocalDate.of(2026, 11, 1));

        VehicleDeadlinePlanEntity inactive = plan(vehicle, 102L);
        inactive.setActive(false);
        inactive.setNextDueDate(LocalDate.of(2026, 12, 1));

        when(planRepository.findAllByTenantId(1L)).thenReturn(List.of(activeMissing, activePresent, inactive));
        when(occurrenceRepository.existsByPlanIdAndDueDateAndTenantId(100L, LocalDate.of(2026, 10, 1), 1L)).thenReturn(false);
        when(occurrenceRepository.existsByPlanIdAndDueDateAndTenantId(101L, LocalDate.of(2026, 11, 1), 1L)).thenReturn(true);

        PlanSyncResultDto result = service.syncMissingOccurrencesFromActivePlans();

        assertEquals(3, result.plansScanned());
        assertEquals(2, result.plansActive());
        assertEquals(1, result.occurrencesCreated());
        assertEquals(1, result.occurrencesAlreadyPresent());
        verify(occurrenceRepository, times(1)).save(any(VehicleDeadlineOccurrenceEntity.class));
    }

    private VehicleEntity vehicle(Long id) {
        VehicleEntity vehicle = new VehicleEntity();
        vehicle.setPlate("AA111AA");
        vehicle.setSeats(4);
        vehicle.setType(VehicleType.SEDAN);

        setField(vehicle, "id", id);
        return vehicle;
    }

    private VehicleDeadlineOccurrenceEntity occurrence(VehicleEntity vehicle, Long id, DeadlineType type) {
        VehicleDeadlineOccurrenceEntity entity = new VehicleDeadlineOccurrenceEntity();
        entity.setVehicle(vehicle);
        entity.setType(type);
        entity.setTitle("Titolo");
        entity.setDueDate(LocalDate.now());
        entity.setStatus(DeadlineStatus.DA_ESEGUIRE);
        entity.setCostAmount(BigDecimal.ZERO);
        entity.setCurrency("EUR");
        setField(entity, "id", id);
        return entity;
    }

    private VehicleDeadlinePlanEntity plan(VehicleEntity vehicle, Long id) {
        VehicleDeadlinePlanEntity entity = new VehicleDeadlinePlanEntity();
        entity.setVehicle(vehicle);
        entity.setType(DeadlineType.BOLLO);
        entity.setTitle("Piano bollo");
        entity.setRecurrenceMonths(12);
        entity.setNextDueDate(LocalDate.now().plusDays(30));
        entity.setStandardCostAmount(BigDecimal.ZERO);
        entity.setCurrency("EUR");
        setField(entity, "id", id);
        return entity;
    }

    private void setField(Object target, String fieldName, Object value) {
        try {
            var field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
