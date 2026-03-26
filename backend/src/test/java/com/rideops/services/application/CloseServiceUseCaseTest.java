package com.rideops.services.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.rideops.services.adapters.out.RideServiceEntity;
import com.rideops.services.domain.ServiceStatus;
import com.rideops.services.domain.ServiceType;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

@ExtendWith(MockitoExtension.class)
class CloseServiceUseCaseTest {

    @Mock
    private ServiceRepositoryPort repository;

    @Mock
    private ApplicationEventPublisher eventPublisher;

    private CloseServiceUseCase useCase;

    @BeforeEach
    void setUp() {
        useCase = new CloseServiceUseCase(repository, eventPublisher);
    }

    @Test
    void rejectDriverCloseWhenServiceAssignedToAnotherDriver() {
        RideServiceEntity entity = assignedService(LocalDateTime.now().minusMinutes(10), 99L);
        when(repository.findById(10L)).thenReturn(Optional.of(entity));

        ServiceValidationException exception = assertThrows(
            ServiceValidationException.class,
            () -> useCase.executeByDriver(10L, 42L)
        );

        assertEquals("Puoi segnare ESEGUITO solo servizi assegnati a te", exception.getMessage());
        verify(repository, never()).save(any(RideServiceEntity.class));
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    void rejectDriverCloseWhenServiceStartsInFuture() {
        RideServiceEntity entity = assignedService(LocalDateTime.now().plusMinutes(30), 42L);
        when(repository.findById(11L)).thenReturn(Optional.of(entity));

        ServiceValidationException exception = assertThrows(
            ServiceValidationException.class,
            () -> useCase.executeByDriver(11L, 42L)
        );

        assertEquals("Puoi segnare come ESEGUITO solo servizi con data/ora di inizio gia` raggiunta", exception.getMessage());
        verify(repository, never()).save(any(RideServiceEntity.class));
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    void executeDriverServiceWhenAssignedOwnedAndStarted() {
        RideServiceEntity entity = assignedService(LocalDateTime.now().minusMinutes(5), 42L);
        when(repository.findById(12L)).thenReturn(Optional.of(entity));
        when(repository.save(any(RideServiceEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ServiceDto dto = useCase.executeByDriver(12L, 42L);

        assertEquals(ServiceStatus.EXECUTED, dto.status());
        verify(repository).save(entity);
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    void closeServiceWhenExecuted() {
        RideServiceEntity entity = executedService();
        when(repository.findById(13L)).thenReturn(Optional.of(entity));
        when(repository.save(any(RideServiceEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ServiceDto dto = useCase.execute(13L);

        assertEquals(ServiceStatus.CLOSED, dto.status());
        verify(repository).save(entity);
        verify(eventPublisher).publishEvent(any(ServiceClosedEvent.class));
    }

    private RideServiceEntity assignedService(LocalDateTime startAt, Long assignedDriverId) {
        RideServiceEntity entity = new RideServiceEntity();
        entity.setStartAt(startAt);
        entity.setPickupLocation("Roma");
        entity.setDestination("Milano");
        entity.setType(ServiceType.TRANSFER);
        entity.setPrice(BigDecimal.valueOf(120));
        entity.setStatus(ServiceStatus.ASSIGNED);
        entity.setAssignedDriverId(assignedDriverId);
        entity.setAssignedVehicleId(7L);
        entity.setCreatedAt(LocalDateTime.now().minusDays(1));
        entity.setUpdatedAt(LocalDateTime.now().minusHours(1));
        return entity;
    }

    private RideServiceEntity executedService() {
        RideServiceEntity entity = assignedService(LocalDateTime.now().minusMinutes(10), 42L);
        entity.setStatus(ServiceStatus.EXECUTED);
        return entity;
    }
}
