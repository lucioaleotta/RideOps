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
class AnnullaRichiestaAssenzaUseCaseTest {

    @Mock
    private RichiestaAssenzaRepositoryPort richiestaAssenzaRepositoryPort;

    @Mock
    private TipoAssenzaRepositoryPort tipoAssenzaRepositoryPort;

    private AnnullaRichiestaAssenzaUseCase useCase;

    @BeforeEach
    void setUp() {
        useCase = new AnnullaRichiestaAssenzaUseCase(richiestaAssenzaRepositoryPort, tipoAssenzaRepositoryPort);
    }

    @Test
    void driverCanCancelBeforeStartDate() {
        RichiestaAssenzaEntity entity = entity(LocalDate.now().plusDays(2), StatoRichiestaAssenza.APPROVATA, 5L);
        when(richiestaAssenzaRepositoryPort.findById(1L)).thenReturn(Optional.of(entity));
        when(richiestaAssenzaRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(tipoAssenzaRepositoryPort.findById(any())).thenReturn(Optional.empty());

        RichiestaAssenzaDto dto = useCase.execute(1L, 5L);

        assertEquals(StatoRichiestaAssenza.ANNULLATA, dto.stato());
    }

    @Test
    void driverCanCancelOnStartDateItself() {
        RichiestaAssenzaEntity entity = entity(LocalDate.now(), StatoRichiestaAssenza.APPROVATA, 5L);
        when(richiestaAssenzaRepositoryPort.findById(1L)).thenReturn(Optional.of(entity));
        when(richiestaAssenzaRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(tipoAssenzaRepositoryPort.findById(any())).thenReturn(Optional.empty());

        RichiestaAssenzaDto dto = useCase.execute(1L, 5L);

        assertEquals(StatoRichiestaAssenza.ANNULLATA, dto.stato());
    }

    @Test
    void driverCannotCancelAfterStartDate() {
        RichiestaAssenzaEntity entity = entity(LocalDate.now().minusDays(1), StatoRichiestaAssenza.APPROVATA, 5L);
        when(richiestaAssenzaRepositoryPort.findById(1L)).thenReturn(Optional.of(entity));

        AssenzaValidationException exception = assertThrows(
            AssenzaValidationException.class,
            () -> useCase.execute(1L, 5L)
        );
        assertEquals("Non è più possibile annullare autonomamente: rivolgiti al Gestionale", exception.getMessage());
    }

    @Test
    void driverCannotCancelAnotherDriverRequest() {
        RichiestaAssenzaEntity entity = entity(LocalDate.now().plusDays(2), StatoRichiestaAssenza.APPROVATA, 5L);
        when(richiestaAssenzaRepositoryPort.findById(1L)).thenReturn(Optional.of(entity));

        assertThrows(AssenzaNotFoundException.class, () -> useCase.execute(1L, 999L));
    }

    @Test
    void gestionaleCanAlwaysCancel() {
        RichiestaAssenzaEntity entity = entity(LocalDate.now().minusDays(10), StatoRichiestaAssenza.APPROVATA, 5L);
        when(richiestaAssenzaRepositoryPort.findById(1L)).thenReturn(Optional.of(entity));
        when(richiestaAssenzaRepositoryPort.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(tipoAssenzaRepositoryPort.findById(any())).thenReturn(Optional.empty());

        RichiestaAssenzaDto dto = useCase.execute(1L, null);

        assertEquals(StatoRichiestaAssenza.ANNULLATA, dto.stato());
    }

    private RichiestaAssenzaEntity entity(LocalDate dataInizio, StatoRichiestaAssenza stato, Long driverId) {
        RichiestaAssenzaEntity entity = new RichiestaAssenzaEntity();
        entity.setDriverId(driverId);
        entity.setTipoAssenzaId(1L);
        entity.setOrigine(OrigineRichiestaAssenza.DRIVER);
        entity.setDataInizio(dataInizio);
        entity.setDataFine(dataInizio.plusDays(2));
        entity.setGiornataIntera(true);
        entity.setStato(stato);
        return entity;
    }
}
