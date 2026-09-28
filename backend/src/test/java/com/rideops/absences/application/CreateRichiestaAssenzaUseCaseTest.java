package com.rideops.absences.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.rideops.absences.adapters.out.RichiestaAssenzaEntity;
import com.rideops.absences.adapters.out.TipoAssenzaEntity;
import com.rideops.absences.domain.OrigineRichiestaAssenza;
import com.rideops.absences.domain.StatoRichiestaAssenza;
import com.rideops.absences.domain.UnitaMisuraAssenza;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CreateRichiestaAssenzaUseCaseTest {

    @Mock
    private RichiestaAssenzaRepositoryPort richiestaAssenzaRepositoryPort;

    @Mock
    private TipoAssenzaRepositoryPort tipoAssenzaRepositoryPort;

    private CreateRichiestaAssenzaUseCase useCase;

    @BeforeEach
    void setUp() {
        useCase = new CreateRichiestaAssenzaUseCase(richiestaAssenzaRepositoryPort, tipoAssenzaRepositoryPort);
    }

    @Test
    void createFerieRequestAsIntAttesa() {
        TipoAssenzaEntity ferie = tipoAssenza(1L, "FER", true, true, false);
        when(tipoAssenzaRepositoryPort.findById(1L)).thenReturn(Optional.of(ferie));
        when(richiestaAssenzaRepositoryPort.findOverlapping(eq(5L), anyCollection(), any(), any()))
            .thenReturn(List.of());
        when(richiestaAssenzaRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        RichiestaAssenzaDto dto = useCase.execute(
            5L, 1L, LocalDate.of(2026, 9, 22), LocalDate.of(2026, 9, 25), true, null, null, "Ferie estive");

        assertEquals(StatoRichiestaAssenza.IN_ATTESA, dto.stato());
        assertEquals(OrigineRichiestaAssenza.DRIVER, dto.origine());
        assertEquals(5L, dto.driverId());
        verify(richiestaAssenzaRepositoryPort).save(any(RichiestaAssenzaEntity.class));
    }

    @Test
    void rejectSganciamentoRequestedByDriver() {
        TipoAssenzaEntity sganciamento = tipoAssenza(6L, "SGA", false, true, false);
        when(tipoAssenzaRepositoryPort.findById(6L)).thenReturn(Optional.of(sganciamento));

        AssenzaValidationException exception = assertThrows(
            AssenzaValidationException.class,
            () -> useCase.execute(5L, 6L, LocalDate.of(2026, 9, 22), LocalDate.of(2026, 9, 22), true, null, null, null)
        );

        assertEquals("Il tipo Sganciamento non è richiedibile dal driver", exception.getMessage());
        verify(richiestaAssenzaRepositoryPort, never()).save(any());
    }

    @Test
    void rejectOverlappingRequest() {
        TipoAssenzaEntity ferie = tipoAssenza(1L, "FER", true, true, false);
        when(tipoAssenzaRepositoryPort.findById(1L)).thenReturn(Optional.of(ferie));
        when(richiestaAssenzaRepositoryPort.findOverlapping(eq(5L), anyCollection(), any(), any()))
            .thenReturn(List.of(new RichiestaAssenzaEntity()));

        AssenzaValidationException exception = assertThrows(
            AssenzaValidationException.class,
            () -> useCase.execute(5L, 1L, LocalDate.of(2026, 9, 22), LocalDate.of(2026, 9, 25), true, null, null, null)
        );

        assertEquals("Esiste già una richiesta di assenza nello stesso periodo per questo driver", exception.getMessage());
    }

    @Test
    void rejectInactiveTipoAssenza() {
        TipoAssenzaEntity ferie = tipoAssenza(1L, "FER", true, true, false);
        ferie.setAttivo(false);
        when(tipoAssenzaRepositoryPort.findById(1L)).thenReturn(Optional.of(ferie));

        assertThrows(
            AssenzaValidationException.class,
            () -> useCase.execute(5L, 1L, LocalDate.of(2026, 9, 22), LocalDate.of(2026, 9, 25), true, null, null, null)
        );
    }

    @Test
    void requireOrarioForPermesso() {
        TipoAssenzaEntity permesso = tipoAssenza(3L, "PER", true, true, true);
        when(tipoAssenzaRepositoryPort.findById(3L)).thenReturn(Optional.of(permesso));

        AssenzaValidationException exception = assertThrows(
            AssenzaValidationException.class,
            () -> useCase.execute(5L, 3L, LocalDate.of(2026, 9, 22), LocalDate.of(2026, 9, 22), true, null, null, null)
        );

        assertEquals("Ora di inizio e ora di fine sono obbligatorie per questa richiesta", exception.getMessage());
    }

    private TipoAssenzaEntity tipoAssenza(Long id, String codice, boolean origineDriver, boolean origineGestionale, boolean richiedeOrario) {
        TipoAssenzaEntity entity = new TipoAssenzaEntity();
        entity.setCodice(codice);
        entity.setNome(codice);
        entity.setUnitaMisura(UnitaMisuraAssenza.GIORNI);
        entity.setOrigineDriverConsentita(origineDriver);
        entity.setOrigineGestionaleConsentita(origineGestionale);
        entity.setRichiedeOrario(richiedeOrario);
        entity.setAttivo(true);
        return entity;
    }
}
