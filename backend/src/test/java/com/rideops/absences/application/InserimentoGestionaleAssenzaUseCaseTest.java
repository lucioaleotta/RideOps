package com.rideops.absences.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

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
class InserimentoGestionaleAssenzaUseCaseTest {

    @Mock
    private RichiestaAssenzaRepositoryPort richiestaAssenzaRepositoryPort;

    @Mock
    private TipoAssenzaRepositoryPort tipoAssenzaRepositoryPort;

    @Mock
    private SaldiDriverService saldiDriverService;

    @Mock
    private VerificaConflittiAssenzaService verificaConflittiAssenzaService;

    private InserimentoGestionaleAssenzaUseCase useCase;

    @BeforeEach
    void setUp() {
        useCase = new InserimentoGestionaleAssenzaUseCase(
            richiestaAssenzaRepositoryPort, tipoAssenzaRepositoryPort, saldiDriverService, verificaConflittiAssenzaService);
    }

    @Test
    void inserimentoSganciamentoIsAutoApproved() {
        TipoAssenzaEntity sganciamento = new TipoAssenzaEntity();
        sganciamento.setCodice("SGA");
        sganciamento.setNome("Sganciamento");
        sganciamento.setUnitaMisura(UnitaMisuraAssenza.GIORNI);
        sganciamento.setOrigineDriverConsentita(false);
        sganciamento.setOrigineGestionaleConsentita(true);
        sganciamento.setAttivo(true);

        when(tipoAssenzaRepositoryPort.findById(6L)).thenReturn(Optional.of(sganciamento));
        when(richiestaAssenzaRepositoryPort.findOverlapping(eq(5L), anyCollection(), any(), any()))
            .thenReturn(List.of());
        when(richiestaAssenzaRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        RichiestaAssenzaDto dto = useCase.execute(
            5L, 6L, LocalDate.of(2026, 9, 22), LocalDate.of(2026, 9, 22), true, null, null, "Sganciamento disciplinare", 99L);

        assertEquals(StatoRichiestaAssenza.APPROVATA, dto.stato());
        assertEquals(OrigineRichiestaAssenza.GESTIONALE, dto.origine());
        assertEquals(99L, dto.approvataDa());
    }

    @Test
    void expiredHolidayInsertedByGestionaleRemainsPendingForExplicitApproval() {
        TipoAssenzaEntity ferie = new TipoAssenzaEntity();
        ferie.setCodice("FER");
        ferie.setNome("Ferie");
        ferie.setUnitaMisura(UnitaMisuraAssenza.GIORNI);
        ferie.setOrigineDriverConsentita(true);
        ferie.setOrigineGestionaleConsentita(true);
        ferie.setAttivo(true);

        when(tipoAssenzaRepositoryPort.findById(1L)).thenReturn(Optional.of(ferie));
        when(richiestaAssenzaRepositoryPort.findOverlapping(eq(5L), anyCollection(), any(), any())).thenReturn(List.of());
        when(saldiDriverService.richiedeApprovazioneEccezionale(
            5L, 1L, LocalDate.of(2026, 10, 10), LocalDate.of(2026, 10, 10), true, null, null)).thenReturn(true);
        when(richiestaAssenzaRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        RichiestaAssenzaDto dto = useCase.execute(
            5L, 1L, LocalDate.of(2026, 10, 10), LocalDate.of(2026, 10, 10), true, null, null, "Ferie residue", 99L);

        assertEquals(StatoRichiestaAssenza.IN_ATTESA, dto.stato());
        assertEquals(true, dto.richiedeApprovazioneEccezionale());
        verify(saldiDriverService).richiedeApprovazioneEccezionale(
            5L, 1L, LocalDate.of(2026, 10, 10), LocalDate.of(2026, 10, 10), true, null, null);
    }
}
