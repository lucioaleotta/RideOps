package com.rideops.phone.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.rideops.phone.adapters.out.PrefissoTelefonicoEntity;
import java.util.List;
import org.junit.jupiter.api.Test;

class ListPrefissiTelefoniciUseCaseTest {

    @Test
    void mapsActivePrefixesKeepingRepositoryOrder() {
        PrefissoTelefonicoRepositoryPort port = mock(PrefissoTelefonicoRepositoryPort.class);
        PrefissoTelefonicoEntity italia = entity("IT", "Italia", "+39", true);
        PrefissoTelefonicoEntity canada = entity("CA", "Canada", "+1", false);
        when(port.findAllAttivi()).thenReturn(List.of(italia, canada));

        List<PrefissoTelefonicoDto> result = new ListPrefissiTelefoniciUseCase(port).execute();

        assertEquals(2, result.size());
        assertEquals(new PrefissoTelefonicoDto("IT", "Italia", "+39", true), result.get(0));
        assertEquals("CA", result.get(1).codiceIso2());
    }

    @Test
    void returnsEmptyListWhenNoPrefixIsActive() {
        PrefissoTelefonicoRepositoryPort port = mock(PrefissoTelefonicoRepositoryPort.class);
        when(port.findAllAttivi()).thenReturn(List.of());

        assertTrue(new ListPrefissiTelefoniciUseCase(port).execute().isEmpty());
    }

    private PrefissoTelefonicoEntity entity(String iso, String name, String prefix, boolean principal) {
        PrefissoTelefonicoEntity entity = mock(PrefissoTelefonicoEntity.class);
        when(entity.getCodiceIso2()).thenReturn(iso);
        when(entity.getNomePaese()).thenReturn(name);
        when(entity.getPrefisso()).thenReturn(prefix);
        when(entity.isPrincipale()).thenReturn(principal);
        return entity;
    }
}
