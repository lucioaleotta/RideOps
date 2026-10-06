package com.rideops.absences.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyLong;
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
import static org.mockito.Mockito.lenient;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null") // Mockito usa null come sentinel nei matcher generici any().
class CreateRichiestaAssenzaUseCaseTest {

    @Mock
    private RichiestaAssenzaRepositoryPort richiestaAssenzaRepositoryPort;

    @Mock
    private TipoAssenzaRepositoryPort tipoAssenzaRepositoryPort;

    @Mock
    private ConfigurazioneAssenzeService configurazioneAssenzeService;

    @Mock
    private SaldiDriverService saldiDriverService;

    private CreateRichiestaAssenzaUseCase useCase;

    @BeforeEach
    void setUp() {
        useCase = new CreateRichiestaAssenzaUseCase(
            richiestaAssenzaRepositoryPort, tipoAssenzaRepositoryPort, configurazioneAssenzeService, saldiDriverService);
        lenient().when(configurazioneAssenzeService.resolveEffectiveConfiguration(anyLong(), anyLong()))
            .thenAnswer(invocation -> config((Long) invocation.getArgument(1), 0));
    }

    @Test
    void createFerieRequestAsIntAttesa() {
        TipoAssenzaEntity ferie = tipoAssenza(1L, "FER", true, true, false);
        when(tipoAssenzaRepositoryPort.findById(1L)).thenReturn(Optional.of(ferie));
        when(richiestaAssenzaRepositoryPort.findOverlapping(eq(5L), anyCollection(), any(), any()))
            .thenReturn(List.of());
        when(richiestaAssenzaRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        RichiestaAssenzaDto dto = useCase.execute(
            5L, 1L, LocalDate.now().plusDays(10), LocalDate.now().plusDays(13), true, null, null, "Ferie estive");

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
            () -> useCase.execute(5L, 6L, LocalDate.now().plusDays(10), LocalDate.now().plusDays(10), true, null, null, null)
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
            () -> useCase.execute(5L, 1L, LocalDate.now().plusDays(10), LocalDate.now().plusDays(13), true, null, null, null)
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
            () -> useCase.execute(5L, 3L, LocalDate.now().plusDays(10), LocalDate.now().plusDays(10), true, null, null, null)
        );

        assertEquals("Ora di inizio e ora di fine sono obbligatorie per questa richiesta", exception.getMessage());
    }

    @Test
    void rejectsDriverRequestWhenCustomNoticePeriodIsNotMet() {
        TipoAssenzaEntity ferie = tipoAssenza(1L, "FER", true, true, false);
        when(tipoAssenzaRepositoryPort.findById(1L)).thenReturn(Optional.of(ferie));
        when(configurazioneAssenzeService.resolveEffectiveConfiguration(5L, 1L)).thenReturn(config(1L, 6));

        AssenzaValidationException exception = assertThrows(AssenzaValidationException.class,
            () -> useCase.execute(5L, 1L, LocalDate.now().plusDays(4), LocalDate.now().plusDays(6), true, null, null, null));

        assertEquals("Questa richiesta richiede almeno 6 giorni di preavviso", exception.getMessage());
        verify(richiestaAssenzaRepositoryPort, never()).save(any());
    }

    @Test
    void createsPendingRequestMarkedForExplicitApprovalWhenUsingExpiredBalance() {
        TipoAssenzaEntity ferie = tipoAssenza(1L, "FER", true, true, false);
        when(tipoAssenzaRepositoryPort.findById(1L)).thenReturn(Optional.of(ferie));
        when(configurazioneAssenzeService.resolveEffectiveConfiguration(5L, 1L)).thenReturn(config(1L, 0));
        when(richiestaAssenzaRepositoryPort.findOverlapping(eq(5L), anyCollection(), any(), any())).thenReturn(List.of());
        when(saldiDriverService.richiedeApprovazioneEccezionale(5L, 1L, LocalDate.now().plusDays(5),
            LocalDate.now().plusDays(5), true, null, null)).thenReturn(true);
        when(richiestaAssenzaRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        RichiestaAssenzaDto dto = useCase.execute(5L, 1L, LocalDate.now().plusDays(5),
            LocalDate.now().plusDays(5), true, null, null, null);

        assertEquals(StatoRichiestaAssenza.IN_ATTESA, dto.stato());
        assertEquals(true, dto.richiedeApprovazioneEccezionale());
        verify(richiestaAssenzaRepositoryPort).save(any(RichiestaAssenzaEntity.class));
    }

    private ConfigurazioneAssenzaDto config(Long tipoId, int preavviso) {
        return new ConfigurazioneAssenzaDto(tipoId, "FER", "Ferie", "GIORNI", false, false,
            true, false, false, null, null, 18, preavviso, null,
            new ConfigurazioneAssenzaInput(true, false, true, null, null, 18, preavviso, null));
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
