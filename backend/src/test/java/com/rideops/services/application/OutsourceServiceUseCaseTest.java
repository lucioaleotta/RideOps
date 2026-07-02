package com.rideops.services.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.rideops.partners.adapters.out.PartnerEntity;
import com.rideops.partners.adapters.out.PartnerRepository;
import com.rideops.multitenancy.TenantContext;
import com.rideops.services.adapters.out.RideServiceEntity;
import com.rideops.services.domain.ServiceAssignmentType;
import com.rideops.services.domain.ServiceStatus;
import com.rideops.services.domain.ServiceType;
import com.rideops.identity.adapters.out.UserEntity;
import com.rideops.identity.application.IdentityUserDetails;
import com.rideops.identity.domain.UserRole;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class OutsourceServiceUseCaseTest {

    @Mock
    private ServiceRepositoryPort serviceRepositoryPort;

    @Mock
    private PartnerRepository partnerRepository;

    @Mock
    private ServicePartnerOperationsUseCase servicePartnerOperationsUseCase;

    private OutsourceServiceUseCase useCase;

    @BeforeEach
    void setUp() {
        applyTenantAuthentication(1L);
        useCase = new OutsourceServiceUseCase(
            serviceRepositoryPort,
            partnerRepository,
            new TenantContext(),
            servicePartnerOperationsUseCase
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
    void outsourceServiceWhenIncoming() {
        RideServiceEntity entity = sampleService();
        entity.setServiceAssignmentType(ServiceAssignmentType.INCOMING);
        entity.setPartnerId(999L);
        entity.setAssignedDriverId(77L);
        entity.setAssignedByUserId(88L);
        entity.setAssignedAt(LocalDateTime.now().minusMinutes(5));
        entity.setAssignedVehicleId(99L);
        entity.setStatus(ServiceStatus.ASSIGNED);
        PartnerEntity partner = new PartnerEntity();
        partner.setDeleted(false);

        when(serviceRepositoryPort.findById(10L)).thenReturn(Optional.of(entity));
        when(partnerRepository.findByIdAndTenantId(20L, 1L)).thenReturn(Optional.of(partner));
        when(serviceRepositoryPort.save(entity)).thenReturn(entity);

        ServiceDto result = useCase.execute(10L, 20L, new BigDecimal("50"));

        assertEquals(ServiceAssignmentType.INCOMING_OUTSOURCED, result.serviceAssignmentType());
        assertEquals(20L, result.outgoingPartnerId());
        assertEquals(999L, result.partnerId());
        assertEquals(new BigDecimal("50"), result.pricePartner());
        assertNull(result.assignedDriverId());
        verify(serviceRepositoryPort).save(entity);
        verify(servicePartnerOperationsUseCase).sendEmailAsyncAfterOutsource(10L, 1L);
    }

    @Test
    void rejectOutsourceWhenServiceClosed() {
        RideServiceEntity entity = sampleService();
        entity.setStatus(ServiceStatus.CLOSED);

        when(serviceRepositoryPort.findById(11L)).thenReturn(Optional.of(entity));

        ServiceValidationException exception = assertThrows(
            ServiceValidationException.class,
            () -> useCase.execute(11L, 20L, new BigDecimal("50"))
        );

        assertEquals("Un servizio ESEGUITO/CLOSED non puo` essere affidato a partner", exception.getMessage());
        verify(serviceRepositoryPort, never()).save(entity);
    }

    @Test
    void outsourceServiceAndCalculateMargin() {
        RideServiceEntity entity = sampleService();
        entity.setAssignedDriverId(77L);
        entity.setAssignedByUserId(88L);
        entity.setAssignedAt(LocalDateTime.now().minusMinutes(5));
        entity.setAssignedVehicleId(99L);
        entity.setStatus(ServiceStatus.ASSIGNED);
        PartnerEntity partner = new PartnerEntity();
        partner.setDeleted(false);

        when(serviceRepositoryPort.findById(12L)).thenReturn(Optional.of(entity));
        when(partnerRepository.findByIdAndTenantId(20L, 1L)).thenReturn(Optional.of(partner));
        when(serviceRepositoryPort.save(entity)).thenReturn(entity);

        ServiceDto dto = useCase.execute(12L, 20L, new BigDecimal("95.00"));

        assertEquals(ServiceAssignmentType.OUTSOURCED, dto.serviceAssignmentType());
        assertEquals(20L, dto.partnerId());
        assertEquals(new BigDecimal("95.00"), dto.pricePartner());
        assertEquals(new BigDecimal("55.00"), dto.margin());
        assertNull(dto.assignedDriverId());
        assertNull(dto.assignedVehicleId());
        assertEquals(ServiceStatus.OPEN, dto.status());
        verify(serviceRepositoryPort).save(entity);
        verify(servicePartnerOperationsUseCase).sendEmailAsyncAfterOutsource(12L, 1L);
    }

    private RideServiceEntity sampleService() {
        RideServiceEntity entity = new RideServiceEntity();
        entity.setStartAt(LocalDateTime.now().plusHours(2));
        entity.setPickupLocation("Roma");
        entity.setDestination("Milano");
        entity.setType(ServiceType.TRANSFER);
        entity.setStatus(ServiceStatus.OPEN);
        entity.setServiceAssignmentType(ServiceAssignmentType.INTERNAL);
        entity.setPrice(new BigDecimal("150.00"));
        return entity;
    }
}
