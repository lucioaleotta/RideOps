package com.rideops.absences.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

import com.rideops.absences.adapters.out.RichiestaAssenzaEntity;
import com.rideops.absences.domain.OrigineRichiestaAssenza;
import com.rideops.absences.domain.StatoRichiestaAssenza;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ListRichiesteAssenzaUseCaseTest {

    @Mock
    private RichiestaAssenzaRepositoryPort richiestaAssenzaRepositoryPort;

    @Mock
    private TipoAssenzaRepositoryPort tipoAssenzaRepositoryPort;

    @Mock
    private VerificaConflittiAssenzaService verificaConflittiAssenzaService;

    private ListRichiesteAssenzaUseCase useCase;

    @BeforeEach
    void setUp() {
        useCase = new ListRichiesteAssenzaUseCase(
            richiestaAssenzaRepositoryPort, tipoAssenzaRepositoryPort, verificaConflittiAssenzaService);
        when(tipoAssenzaRepositoryPort.findById(org.mockito.ArgumentMatchers.any())).thenReturn(Optional.empty());
    }

    @Test
    void driverScopeReturnsOnlyOwnRequests() {
        when(richiestaAssenzaRepositoryPort.findAllForDriver(5L)).thenReturn(List.of(
            entity(5L, StatoRichiestaAssenza.IN_ATTESA)
        ));

        List<RichiestaAssenzaDto> result = useCase.execute(5L, 5L, null, null, null, null, null);

        assertEquals(1, result.size());
        assertEquals(5L, result.get(0).driverId());
    }

    @Test
    void gestionaleScopeFiltersByStato() {
        when(richiestaAssenzaRepositoryPort.findAllForTenant()).thenReturn(List.of(
            entity(5L, StatoRichiestaAssenza.IN_ATTESA),
            entity(6L, StatoRichiestaAssenza.APPROVATA)
        ));

        List<RichiestaAssenzaDto> result = useCase.execute(null, null, StatoRichiestaAssenza.APPROVATA, null, null, null, null);

        assertEquals(1, result.size());
        assertEquals(6L, result.get(0).driverId());
    }

    private RichiestaAssenzaEntity entity(Long driverId, StatoRichiestaAssenza stato) {
        RichiestaAssenzaEntity entity = new RichiestaAssenzaEntity();
        entity.setDriverId(driverId);
        entity.setTipoAssenzaId(1L);
        entity.setOrigine(OrigineRichiestaAssenza.DRIVER);
        entity.setDataInizio(LocalDate.of(2026, 9, 22));
        entity.setDataFine(LocalDate.of(2026, 9, 25));
        entity.setGiornataIntera(true);
        entity.setStato(stato);
        return entity;
    }
}
