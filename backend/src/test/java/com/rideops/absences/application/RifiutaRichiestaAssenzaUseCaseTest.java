package com.rideops.absences.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.rideops.absences.adapters.out.RichiestaAssenzaEntity;
import com.rideops.absences.domain.OrigineRichiestaAssenza;
import com.rideops.absences.domain.StatoRichiestaAssenza;
import java.time.LocalDate;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class RifiutaRichiestaAssenzaUseCaseTest {

    @Mock
    private RichiestaAssenzaRepositoryPort richiestaAssenzaRepositoryPort;

    @Mock
    private TipoAssenzaRepositoryPort tipoAssenzaRepositoryPort;

    private RifiutaRichiestaAssenzaUseCase useCase;

    @BeforeEach
    void setUp() {
        useCase = new RifiutaRichiestaAssenzaUseCase(richiestaAssenzaRepositoryPort, tipoAssenzaRepositoryPort);
    }

    @Test
    void rejectMissingMotivo() {
        AssenzaValidationException exception = assertThrows(
            AssenzaValidationException.class,
            () -> useCase.execute(1L, "  ", 42L)
        );
        assertEquals("Il motivo del rifiuto è obbligatorio", exception.getMessage());
        verify(richiestaAssenzaRepositoryPort, never()).findById(any());
    }

    @Test
    void rifiutaPendingRequest() {
        RichiestaAssenzaEntity entity = pendingEntity();
        when(richiestaAssenzaRepositoryPort.findById(1L)).thenReturn(Optional.of(entity));
        when(richiestaAssenzaRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(tipoAssenzaRepositoryPort.findById(any())).thenReturn(Optional.empty());

        RichiestaAssenzaDto dto = useCase.execute(1L, "Copertura turni insufficiente", 42L);

        assertEquals(StatoRichiestaAssenza.RIFIUTATA, dto.stato());
        assertEquals("Copertura turni insufficiente", dto.motivoRifiuto());
    }

    private RichiestaAssenzaEntity pendingEntity() {
        RichiestaAssenzaEntity entity = new RichiestaAssenzaEntity();
        entity.setDriverId(5L);
        entity.setTipoAssenzaId(1L);
        entity.setOrigine(OrigineRichiestaAssenza.DRIVER);
        entity.setDataInizio(LocalDate.of(2026, 9, 22));
        entity.setDataFine(LocalDate.of(2026, 9, 25));
        entity.setGiornataIntera(true);
        entity.setStato(StatoRichiestaAssenza.IN_ATTESA);
        return entity;
    }
}
