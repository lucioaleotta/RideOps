package com.rideops.services.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.rideops.partners.adapters.out.PartnerEntity;
import com.rideops.partners.adapters.out.PartnerRepository;
import com.rideops.services.adapters.out.RideServiceEntity;
import com.rideops.services.domain.ServiceAssignmentType;
import com.rideops.services.domain.ServiceStatus;
import com.rideops.services.domain.ServiceType;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class UpdateServiceUseCaseTest {

    @Mock
    private ServiceRepositoryPort serviceRepositoryPort;

    @Mock
    private VehicleAssignmentValidationService vehicleAssignmentValidationService;

    @Mock
    private PartnerRepository partnerRepository;

    @Mock
    private com.rideops.multitenancy.TenantContext tenantContext;

    @Test
    void clearInternalAssignmentsWhenUpdatingServiceToOutsourced() {
        RideServiceEntity entity = new RideServiceEntity();
        entity.setStartAt(LocalDateTime.of(2025, 1, 10, 10, 0));
        entity.setPickupLocation("Roma");
        entity.setDestination("Milano");
        entity.setType(ServiceType.TRANSFER);
        entity.setStatus(ServiceStatus.ASSIGNED);
        entity.setServiceAssignmentType(ServiceAssignmentType.INTERNAL);
        entity.setPrice(new BigDecimal("150.00"));
        entity.setAssignedDriverId(77L);
        entity.setAssignedByUserId(88L);
        entity.setAssignedAt(LocalDateTime.of(2025, 1, 9, 9, 0));
        entity.setAssignedVehicleId(99L);

        PartnerEntity partner = new PartnerEntity();
        partner.setDeleted(false);

        when(serviceRepositoryPort.findById(10L)).thenReturn(Optional.of(entity));
        when(tenantContext.requireTenantId()).thenReturn(1L);
        when(partnerRepository.findByIdAndTenantId(20L, 1L)).thenReturn(Optional.of(partner));
        when(serviceRepositoryPort.save(entity)).thenReturn(entity);

        UpdateServiceUseCase useCase = new UpdateServiceUseCase(
            serviceRepositoryPort,
            vehicleAssignmentValidationService,
            partnerRepository,
            tenantContext
        );

        UpdateServiceCommand command = new UpdateServiceCommand(
            LocalDateTime.of(2025, 1, 10, 10, 0),
            "Roma",
            "Milano",
            ServiceType.TRANSFER,
            null,
            null,
            new BigDecimal("150.00"),
            null,
            null,
            null,
            null,
            null,
            null,
            ServiceStatus.ASSIGNED,
            ServiceAssignmentType.OUTSOURCED,
            20L,
            null,
            new BigDecimal("95.00"),
            99L,
            false,
            false
        );

        ServiceDto result = useCase.execute(10L, command);

        assertEquals(ServiceAssignmentType.OUTSOURCED, result.serviceAssignmentType());
        assertEquals(new BigDecimal("95.00"), result.pricePartner());
        assertEquals(new BigDecimal("55.00"), result.margin());
        assertNull(result.assignedDriverId());
        assertNull(result.assignedVehicleId());
        assertEquals(ServiceStatus.OPEN, result.status());
        verify(vehicleAssignmentValidationService).validateForUpdate(10L, command);
        verify(serviceRepositoryPort).save(entity);
    }
}