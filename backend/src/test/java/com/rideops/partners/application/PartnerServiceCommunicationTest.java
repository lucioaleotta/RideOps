package com.rideops.partners.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.rideops.identity.adapters.out.EmailOutboxEntity;
import com.rideops.identity.adapters.out.EmailOutboxRepository;
import com.rideops.identity.adapters.out.UserEntity;
import com.rideops.identity.application.IdentityUserDetails;
import com.rideops.identity.domain.UserRole;
import com.rideops.partners.adapters.out.PartnerEntity;
import com.rideops.partners.adapters.out.PartnerRepository;
import com.rideops.partners.adapters.out.PartnerServiceCommunicationEntity;
import com.rideops.partners.adapters.out.PartnerServiceCommunicationRepository;
import com.rideops.services.adapters.out.RideServiceEntity;
import com.rideops.services.adapters.out.RideServiceRepository;
import com.rideops.services.domain.ServiceAssignmentType;
import com.rideops.services.domain.ServiceStatus;
import com.rideops.services.domain.ServiceType;
import com.rideops.multitenancy.TenantContext;
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
class PartnerServiceCommunicationTest {

    @Mock
    private PartnerRepository partnerRepository;

    @Mock
    private RideServiceRepository rideServiceRepository;

    @Mock
    private EmailOutboxRepository emailOutboxRepository;

    @Mock
    private PartnerServiceCommunicationRepository communicationRepository;

    private PartnerService service;

    @BeforeEach
    void setUp() {
        applyTenantAuthentication(1L);
        service = new PartnerService(
            partnerRepository,
            rideServiceRepository,
            emailOutboxRepository,
            communicationRepository,
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
    void sendServiceEmailWritesOutboxAndCommunication() {
        PartnerEntity partner = new PartnerEntity();
        partner.setDeleted(false);
        partner.setRiceveEmail(true);
        partner.setEmail("partner@test.it");
        setField(partner, "id", 7L);

        RideServiceEntity rideService = new RideServiceEntity();
        rideService.setStartAt(LocalDateTime.of(2026, 5, 12, 9, 0));
        rideService.setPickupLocation("Verona Centro");
        rideService.setDestination("Lago di Como Tour");
        rideService.setType(ServiceType.TOUR);
        rideService.setStatus(ServiceStatus.OPEN);
        rideService.setServiceAssignmentType(ServiceAssignmentType.OUTSOURCED);
        rideService.setPartnerId(7L);
        rideService.setInternalBookingReference("27-26");
        rideService.setClientName("Mario Rossi");
        rideService.setClientPhone("333123123");
        rideService.setClientEmail("mario@example.com");
        rideService.setPassengersCount(3);
        rideService.setItinerary("Verona -> Como");
        rideService.setPricePartner(new BigDecimal("900.00"));
        setField(rideService, "id", 27L);

        PartnerServiceCommunicationEntity comm = new PartnerServiceCommunicationEntity();
        setField(comm, "id", 50L);

        when(partnerRepository.findByIdAndTenantId(7L, 1L)).thenReturn(Optional.of(partner));
        when(rideServiceRepository.findByIdAndTenantId(27L, 1L)).thenReturn(Optional.of(rideService));
        when(emailOutboxRepository.save(any(EmailOutboxEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(communicationRepository.save(any(PartnerServiceCommunicationEntity.class))).thenReturn(comm);

        PartnerEmailCommunicationResultDto result = service.sendServiceEmail(7L, 27L);

        assertEquals(50L, result.communicationId());
        assertEquals(7L, result.partnerId());
        assertEquals(27L, result.serviceId());
        assertEquals("partner@test.it", result.recipient());
        verify(emailOutboxRepository).save(any(EmailOutboxEntity.class));
        verify(communicationRepository).save(any(PartnerServiceCommunicationEntity.class));
    }

    @Test
    void rejectServiceEmailWhenServiceNotLinkedToPartner() {
        PartnerEntity partner = new PartnerEntity();
        partner.setDeleted(false);
        partner.setRiceveEmail(true);
        partner.setEmail("partner@test.it");
        setField(partner, "id", 7L);

        RideServiceEntity rideService = new RideServiceEntity();
        rideService.setPartnerId(99L);
        setField(rideService, "id", 27L);

        when(partnerRepository.findByIdAndTenantId(7L, 1L)).thenReturn(Optional.of(partner));
        when(rideServiceRepository.findByIdAndTenantId(27L, 1L)).thenReturn(Optional.of(rideService));

        PartnerValidationException exception = assertThrows(
            PartnerValidationException.class,
            () -> service.sendServiceEmail(7L, 27L)
        );

        assertEquals("Il servizio non risulta associato al partner selezionato", exception.getMessage());
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
