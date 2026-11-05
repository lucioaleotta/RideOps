package com.rideops.services.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.rideops.services.adapters.out.RideServiceEntity;
import com.rideops.services.domain.ServiceStatus;
import com.rideops.services.domain.ServiceAssignmentType;
import com.rideops.services.domain.ServiceType;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import org.mockito.ArgumentCaptor;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
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

    @Test
    void manuallyCloseOutsourcedServiceAndRecordAuditOnce() {
        RideServiceEntity entity = manualOutsourcedService(LocalDateTime.now().minusMinutes(1));
        when(repository.findByIdForUpdate(20L)).thenReturn(Optional.of(entity));
        when(repository.save(entity)).thenReturn(entity);

        ServiceDto dto = useCase.executeManualOutsourcedClose(20L, true, 42L);

        assertEquals(ServiceStatus.CLOSED, dto.status());
        assertEquals(42L, entity.getClosedByUserId());
        assertEquals("MANUAL_PARTNER_CONFIRMED", entity.getCloseMode());
        org.junit.jupiter.api.Assertions.assertNotNull(entity.getClosedAt());
        verify(repository).save(entity);
        verify(eventPublisher).publishEvent(any(ServiceClosedEvent.class));
    }

    @Test
    void rejectManualCloseWithoutPartnerConfirmation() {
        ServiceValidationException exception = assertThrows(
            ServiceValidationException.class,
            () -> useCase.executeManualOutsourcedClose(21L, false, 42L)
        );

        assertEquals("Conferma obbligatoria dell'esecuzione da parte del partner", exception.getMessage());
        verify(repository, never()).findByIdForUpdate(any());
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    void rejectManualCloseBeforePlannedStart() {
        RideServiceEntity entity = manualOutsourcedService(LocalDateTime.now().plusMinutes(1));
        when(repository.findByIdForUpdate(22L)).thenReturn(Optional.of(entity));

        ServiceValidationException exception = assertThrows(
            ServiceValidationException.class,
            () -> useCase.executeManualOutsourcedClose(22L, true, 42L)
        );

        assertEquals("Non è possibile chiudere il servizio prima della data/ora prevista", exception.getMessage());
        verify(repository, never()).save(any(RideServiceEntity.class));
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    void rejectManualCloseForInternalService() {
        RideServiceEntity entity = manualOutsourcedService(LocalDateTime.now().minusMinutes(1));
        entity.setServiceAssignmentType(ServiceAssignmentType.INTERNAL);
        when(repository.findByIdForUpdate(23L)).thenReturn(Optional.of(entity));

        ServiceValidationException exception = assertThrows(
            ServiceValidationException.class,
            () -> useCase.executeManualOutsourcedClose(23L, true, 42L)
        );

        assertEquals("La chiusura manuale è consentita solo per servizi affidati a un partner esecutore", exception.getMessage());
        verify(repository, never()).save(any(RideServiceEntity.class));
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    void rejectManualCloseForIncomingServiceWithoutExecutorAssignment() {
        RideServiceEntity entity = manualOutsourcedService(LocalDateTime.now().minusMinutes(1));
        entity.setServiceAssignmentType(ServiceAssignmentType.INCOMING);
        when(repository.findByIdForUpdate(25L)).thenReturn(Optional.of(entity));

        assertThrows(ServiceValidationException.class,
            () -> useCase.executeManualOutsourcedClose(25L, true, 42L));

        verify(repository, never()).save(any(RideServiceEntity.class));
        verify(eventPublisher, never()).publishEvent(any());
    }

    @Test
    void manuallyCloseIncomingOutsourcedServiceAndPublishCorrectAccountingMode() {
        RideServiceEntity entity = manualOutsourcedService(LocalDateTime.now().minusMinutes(1));
        entity.setServiceAssignmentType(ServiceAssignmentType.INCOMING_OUTSOURCED);
        entity.setPartnerId(80L);
        entity.setOutgoingPartnerId(70L);
        when(repository.findByIdForUpdate(26L)).thenReturn(Optional.of(entity));
        when(repository.save(entity)).thenReturn(entity);

        ServiceDto dto = useCase.executeManualOutsourcedClose(26L, true, 42L);

        assertEquals(ServiceStatus.CLOSED, dto.status());
        ArgumentCaptor<ServiceClosedEvent> eventCaptor = ArgumentCaptor.forClass(ServiceClosedEvent.class);
        verify(eventPublisher).publishEvent(eventCaptor.capture());
        assertEquals(ServiceAssignmentType.INCOMING_OUTSOURCED, eventCaptor.getValue().serviceAssignmentType());
        assertEquals(new BigDecimal("40"), eventCaptor.getValue().margin());
    }

    @Test
    void repeatedManualCloseDoesNotSaveOrPublishAgain() {
        RideServiceEntity entity = manualOutsourcedService(LocalDateTime.now().minusMinutes(1));
        entity.setStatus(ServiceStatus.CLOSED);
        entity.setCloseMode("MANUAL_PARTNER_CONFIRMED");
        when(repository.findByIdForUpdate(24L)).thenReturn(Optional.of(entity));

        ServiceDto dto = useCase.executeManualOutsourcedClose(24L, true, 42L);

        assertEquals(ServiceStatus.CLOSED, dto.status());
        verify(repository, never()).save(any(RideServiceEntity.class));
        verify(eventPublisher, never()).publishEvent(any());
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

    private RideServiceEntity manualOutsourcedService(LocalDateTime startAt) {
        RideServiceEntity entity = new RideServiceEntity();
        entity.setStartAt(startAt);
        entity.setPickupLocation("Roma");
        entity.setDestination("Milano");
        entity.setType(ServiceType.TRANSFER);
        entity.setStatus(ServiceStatus.OPEN);
        entity.setServiceAssignmentType(ServiceAssignmentType.OUTSOURCED);
        entity.setPartnerId(70L);
        entity.setTenantId(1L);
        entity.setPrice(BigDecimal.valueOf(120));
        entity.setPricePartner(BigDecimal.valueOf(80));
        entity.setMargin(BigDecimal.valueOf(40));
        return entity;
    }
}
