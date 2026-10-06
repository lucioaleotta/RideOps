package com.rideops.absences.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
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
class ApprovaRichiestaAssenzaUseCaseTest {

    @Mock
    private RichiestaAssenzaRepositoryPort richiestaAssenzaRepositoryPort;

    @Mock
    private TipoAssenzaRepositoryPort tipoAssenzaRepositoryPort;

    @Mock
    private SaldiDriverService saldiDriverService;

    @Mock
    private VerificaConflittiAssenzaService verificaConflittiAssenzaService;

    private ApprovaRichiestaAssenzaUseCase useCase;

    @BeforeEach
    void setUp() {
        useCase = new ApprovaRichiestaAssenzaUseCase(
            richiestaAssenzaRepositoryPort, tipoAssenzaRepositoryPort, saldiDriverService, verificaConflittiAssenzaService);
    }

    @Test
    void approvePendingRequest() {
        RichiestaAssenzaEntity entity = pendingEntity();
        when(richiestaAssenzaRepositoryPort.findById(1L)).thenReturn(Optional.of(entity));
        when(richiestaAssenzaRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(tipoAssenzaRepositoryPort.findById(any())).thenReturn(Optional.empty());

        RichiestaAssenzaDto dto = useCase.execute(1L, 42L);

        assertEquals(StatoRichiestaAssenza.APPROVATA, dto.stato());
        assertEquals(42L, dto.approvataDa());
    }

    @Test
    void rejectApprovalWhenNotPending() {
        RichiestaAssenzaEntity entity = pendingEntity();
        entity.setStato(StatoRichiestaAssenza.RIFIUTATA);
        when(richiestaAssenzaRepositoryPort.findById(1L)).thenReturn(Optional.of(entity));

        AssenzaValidationException exception = assertThrows(
            AssenzaValidationException.class,
            () -> useCase.execute(1L, 42L)
        );
        assertEquals("Solo una richiesta in attesa può essere approvata", exception.getMessage());
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
