package com.rideops.partners.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.rideops.partners.adapters.out.PartnerEntity;
import com.rideops.partners.adapters.out.PartnerRepository;
import com.rideops.partners.domain.PartnerType;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PartnerServiceTest {

    @Mock
    private PartnerRepository partnerRepository;

    private PartnerService service;

    @BeforeEach
    void setUp() {
        service = new PartnerService(partnerRepository);
    }

    @Test
    void searchExcludesDeletedWhenIncludeDeletedIsFalse() {
        PartnerEntity active = partner(1L, PartnerType.AGENZIA, "Travel One", false);
        PartnerEntity deleted = partner(2L, PartnerType.AGENZIA, "Travel Old", true);

        when(partnerRepository.findAllByOrderByRagioneSocialeAsc()).thenReturn(List.of(active, deleted));

        List<PartnerDto> result = service.search(null, null, false);

        assertEquals(1, result.size());
        assertEquals("Travel One", result.get(0).ragioneSociale());
        verify(partnerRepository).findAllByOrderByRagioneSocialeAsc();
    }

    @Test
    void searchIncludesDeletedWhenIncludeDeletedIsTrue() {
        PartnerEntity active = partner(1L, PartnerType.NCC, "NCC Alpha", false);
        PartnerEntity deleted = partner(2L, PartnerType.NCC, "NCC Beta", true);

        when(partnerRepository.findAllByTypeOrderByRagioneSocialeAsc(PartnerType.NCC)).thenReturn(List.of(active, deleted));

        List<PartnerDto> result = service.search(null, PartnerType.NCC, true);

        assertEquals(2, result.size());
        assertTrue(result.stream().anyMatch(item -> item.deleted()));
        verify(partnerRepository).findAllByTypeOrderByRagioneSocialeAsc(PartnerType.NCC);
    }

    @Test
    void searchFiltersRagioneSocialeCaseInsensitive() {
        PartnerEntity p1 = partner(1L, PartnerType.AGENZIA, "Sicily Travel Group", false);
        PartnerEntity p2 = partner(2L, PartnerType.AGENZIA, "Roma incoming", false);
        PartnerEntity p3 = partner(3L, PartnerType.AGENZIA, "TRAVEL Hub Milano", false);

        when(partnerRepository.findAllByTypeOrderByRagioneSocialeAsc(PartnerType.AGENZIA)).thenReturn(List.of(p1, p2, p3));

        List<PartnerDto> result = service.search("travel", PartnerType.AGENZIA, false);

        assertEquals(2, result.size());
        assertTrue(result.stream().allMatch(item -> item.ragioneSociale().toLowerCase().contains("travel")));
        verify(partnerRepository).findAllByTypeOrderByRagioneSocialeAsc(PartnerType.AGENZIA);
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
}
