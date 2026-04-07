package com.rideops.partners.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.rideops.identity.adapters.out.EmailOutboxRepository;
import com.rideops.identity.adapters.out.UserEntity;
import com.rideops.identity.application.IdentityUserDetails;
import com.rideops.identity.domain.UserRole;
import com.rideops.partners.adapters.out.PartnerEntity;
import com.rideops.partners.adapters.out.PartnerRepository;
import com.rideops.partners.adapters.out.PartnerServiceCommunicationRepository;
import com.rideops.partners.domain.PartnerType;
import com.rideops.services.adapters.out.RideServiceRepository;
import com.rideops.services.domain.ServiceAssignmentType;
import com.rideops.multitenancy.TenantContext;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

@ExtendWith(MockitoExtension.class)
class PartnerServiceTest {

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
    void searchExcludesDeletedWhenIncludeDeletedIsFalse() {
        PartnerEntity active = partner(1L, PartnerType.AGENZIA, "Travel One", false);
        PartnerEntity deleted = partner(2L, PartnerType.AGENZIA, "Travel Old", true);

        when(partnerRepository.findAllByTenantIdOrderByRagioneSocialeAsc(1L)).thenReturn(List.of(active, deleted));
        mockAccounting(active.getId());

        List<PartnerDto> result = service.search(null, null, false);

        assertEquals(1, result.size());
        assertEquals("Travel One", result.get(0).ragioneSociale());
        verify(partnerRepository).findAllByTenantIdOrderByRagioneSocialeAsc(1L);
    }

    @Test
    void searchIncludesDeletedWhenIncludeDeletedIsTrue() {
        PartnerEntity active = partner(1L, PartnerType.NCC, "NCC Alpha", false);
        PartnerEntity deleted = partner(2L, PartnerType.NCC, "NCC Beta", true);

        when(partnerRepository.findAllByTypeAndTenantIdOrderByRagioneSocialeAsc(PartnerType.NCC, 1L)).thenReturn(List.of(active, deleted));
        mockAccounting(active.getId());
        mockAccounting(deleted.getId());

        List<PartnerDto> result = service.search(null, PartnerType.NCC, true);

        assertEquals(2, result.size());
        assertTrue(result.stream().anyMatch(item -> item.deleted()));
        verify(partnerRepository).findAllByTypeAndTenantIdOrderByRagioneSocialeAsc(PartnerType.NCC, 1L);
    }

    @Test
    void searchFiltersRagioneSocialeCaseInsensitive() {
        PartnerEntity p1 = partner(1L, PartnerType.AGENZIA, "Sicily Travel Group", false);
        PartnerEntity p2 = partner(2L, PartnerType.AGENZIA, "Roma incoming", false);
        PartnerEntity p3 = partner(3L, PartnerType.AGENZIA, "TRAVEL Hub Milano", false);

        when(partnerRepository.findAllByTypeAndTenantIdOrderByRagioneSocialeAsc(PartnerType.AGENZIA, 1L)).thenReturn(List.of(p1, p2, p3));
        mockAccounting(p1.getId());
        mockAccounting(p3.getId());

        List<PartnerDto> result = service.search("travel", PartnerType.AGENZIA, false);

        assertEquals(2, result.size());
        assertTrue(result.stream().allMatch(item -> item.ragioneSociale().toLowerCase().contains("travel")));
        verify(partnerRepository).findAllByTypeAndTenantIdOrderByRagioneSocialeAsc(PartnerType.AGENZIA, 1L);
    }

    @Test
    void getByIdReturnsPartnerAccountingSummary() {
        PartnerEntity partner = partner(7L, PartnerType.NCC, "Partner Contabile", false);

        when(partnerRepository.findByIdAndTenantId(7L, 1L)).thenReturn(java.util.Optional.of(partner));
        when(rideServiceRepository.countByPartnerIdAndServiceAssignmentTypeAndTenantId(7L, ServiceAssignmentType.OUTSOURCED, 1L))
            .thenReturn(8L);
        when(rideServiceRepository.countByPartnerIdAndServiceAssignmentTypeAndTenantId(7L, ServiceAssignmentType.INCOMING, 1L))
            .thenReturn(3L);
        when(rideServiceRepository.sumMarginByPartnerIdAndAssignmentType(7L, ServiceAssignmentType.OUTSOURCED, 1L))
            .thenReturn(new BigDecimal("1240.50"));
        when(rideServiceRepository.sumPriceByPartnerIdAndAssignmentType(7L, ServiceAssignmentType.INCOMING, 1L))
            .thenReturn(new BigDecimal("2750.00"));
        when(rideServiceRepository.sumPricePartnerByPartnerIdAndAssignmentType(7L, ServiceAssignmentType.OUTSOURCED, 1L))
            .thenReturn(new BigDecimal("1980.00"));

        PartnerDto result = service.getById(7L);

        assertEquals(8L, result.numeroServiziAffidati());
        assertEquals(3L, result.numeroServiziRicevuti());
        assertEquals(new BigDecimal("1240.50"), result.totaleMarginiOutsourced());
        assertEquals(new BigDecimal("2750.00"), result.totaleRicaviIncoming());
        assertEquals(new BigDecimal("3990.50"), result.totaleGuadagni());
        assertEquals(new BigDecimal("2750.00"), result.totaleCrediti());
        assertEquals(new BigDecimal("1980.00"), result.totaleDebiti());
        assertEquals(new BigDecimal("770.00"), result.saldoAttuale());
    }

    private PartnerEntity partner(Long id, PartnerType type, String ragioneSociale, boolean deleted) {
        PartnerEntity entity = new PartnerEntity();
        entity.setType(type);
        entity.setRagioneSociale(ragioneSociale);
        entity.setDeleted(deleted);
        entity.setRiceveEmail(true);
        entity.setRiceveWhatsApp(false);

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

    private void mockAccounting(Long partnerId) {
        when(rideServiceRepository.countByPartnerIdAndServiceAssignmentTypeAndTenantId(partnerId, ServiceAssignmentType.OUTSOURCED, 1L))
            .thenReturn(0L);
        when(rideServiceRepository.countByPartnerIdAndServiceAssignmentTypeAndTenantId(partnerId, ServiceAssignmentType.INCOMING, 1L))
            .thenReturn(0L);
        when(rideServiceRepository.sumMarginByPartnerIdAndAssignmentType(partnerId, ServiceAssignmentType.OUTSOURCED, 1L))
            .thenReturn(BigDecimal.ZERO);
        when(rideServiceRepository.sumPriceByPartnerIdAndAssignmentType(partnerId, ServiceAssignmentType.INCOMING, 1L))
            .thenReturn(BigDecimal.ZERO);
        when(rideServiceRepository.sumPricePartnerByPartnerIdAndAssignmentType(partnerId, ServiceAssignmentType.OUTSOURCED, 1L))
            .thenReturn(BigDecimal.ZERO);
    }
}
