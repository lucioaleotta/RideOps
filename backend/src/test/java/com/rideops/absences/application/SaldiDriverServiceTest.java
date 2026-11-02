package com.rideops.absences.application;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.rideops.absences.adapters.out.ConsumoSaldoAssenzaRepository;
import com.rideops.absences.adapters.out.SaldoDriverEntity;
import com.rideops.absences.adapters.out.SaldoDriverRepository;
import com.rideops.absences.adapters.out.TipoAssenzaEntity;
import com.rideops.absences.domain.UnitaMisuraAssenza;
import com.rideops.identity.adapters.out.UserEntity;
import com.rideops.identity.application.admin.UserAdminRepositoryPort;
import com.rideops.identity.domain.UserRole;
import com.rideops.multitenancy.TenantContext;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

@ExtendWith(MockitoExtension.class)
class SaldiDriverServiceTest {

    @Mock private SaldoDriverRepository saldoRepository;
    @Mock private ConsumoSaldoAssenzaRepository consumoRepository;
    @Mock private ConfigurazioneAssenzeService configurazioneAssenzeService;
    @Mock private TipoAssenzaRepositoryPort tipoRepository;
    @Mock private UserAdminRepositoryPort userRepository;
    @Mock private TenantContext tenantContext;
    @Mock private UserEntity driver;

    private SaldiDriverService service;
    private TipoAssenzaEntity ferie;

    @BeforeEach
    void setUp() {
        service = new SaldiDriverService(saldoRepository, consumoRepository, configurazioneAssenzeService,
            tipoRepository, userRepository, tenantContext);
        ferie = new TipoAssenzaEntity();
        ferie.setCodice("FER");
        ferie.setNome("Ferie");
        ferie.setUnitaMisura(UnitaMisuraAssenza.GIORNI);
        ferie.setAttivo(true);
        ReflectionTestUtils.setField(ferie, "id", 1L);
        when(tenantContext.requireTenantId()).thenReturn(7L);
        when(userRepository.findById(12L)).thenReturn(Optional.of(driver));
        when(driver.getTenantId()).thenReturn(7L);
        when(driver.getRole()).thenReturn(UserRole.DRIVER);
        when(driver.isEnabled()).thenReturn(true);
        lenient().when(tipoRepository.findById(1L)).thenReturn(Optional.of(ferie));
        lenient().when(configurazioneAssenzeService.resolveEffectiveConfiguration(12L, 1L)).thenReturn(config(1L));
    }

    @Test
    void requiresExplicitApprovalWhenOnlyExpiredHolidayBalanceCanCoverRequest() {
        when(configurazioneAssenzeService.resolveEffectiveConfiguration(12L, 1L))
            .thenReturn(config(1L, "26", "accumulo_esteso", 0));
        when(saldoRepository.findAllByTenantIdAndDriverIdAndTipoAssenzaIdOrderByAnnoMaturazioneAsc(7L, 12L, 1L))
            .thenReturn(List.of(cohort(2023, "5", "0")));

        boolean exceptional = service.richiedeApprovazioneEccezionale(
            12L, 1L, LocalDate.now().plusDays(1), LocalDate.now().plusDays(5), true, null, null);

        assertTrue(exceptional);
    }

    @Test
    void usesValidHolidayBalanceBeforeExpiredBalance() {
        when(configurazioneAssenzeService.resolveEffectiveConfiguration(12L, 1L))
            .thenReturn(config(1L, "26", "accumulo_esteso", 18));
        when(saldoRepository.findAllByTenantIdAndDriverIdAndTipoAssenzaIdOrderByAnnoMaturazioneAsc(7L, 12L, 1L))
            .thenReturn(List.of(cohort(2023, "5", "0"), cohort(LocalDate.now().getYear(), "10", "0")));

        boolean exceptional = service.richiedeApprovazioneEccezionale(
            12L, 1L, LocalDate.now().plusDays(1), LocalDate.now().plusDays(5), true, null, null);

        assertFalse(exceptional);
    }

    @Test
    void initializesCurrentYearCohortFromEffectiveAnnualConfiguration() {
        when(tipoRepository.findAllAttivi()).thenReturn(List.of(ferie));
        when(saldoRepository.findAllByTenantIdAndDriverIdAndTipoAssenzaIdOrderByAnnoMaturazioneAsc(7L, 12L, 1L))
            .thenReturn(List.of(cohort(LocalDate.now().getYear(), "26", "0")));

        List<SaldoAssenzaDto> balances = service.getSaldi(12L);

        assertTrue(balances.get(0).saldoAnnuale());
        assertTrue(balances.get(0).saldoCaricato());
        verify(saldoRepository).insertCohortIfMissing(eq(7L), eq(12L), eq(1L), eq(LocalDate.now().getYear()),
            eq(new BigDecimal("26.00")));
    }

    @Test
    void ignoresPreviousYearCohortsForNonHolidayAnnualBalances() {
        TipoAssenzaEntity permesso = new TipoAssenzaEntity();
        ReflectionTestUtils.setField(permesso, "id", 2L);
        permesso.setCodice("PER");
        permesso.setNome("Permesso");
        permesso.setUnitaMisura(UnitaMisuraAssenza.ORE);
        permesso.setAttivo(true);
        when(tipoRepository.findAllAttivi()).thenReturn(List.of(permesso));
        when(configurazioneAssenzeService.resolveEffectiveConfiguration(12L, 2L))
            .thenReturn(config(2L, "32", "azzeramento_annuale", null));
        when(saldoRepository.findAllByTenantIdAndDriverIdAndTipoAssenzaIdOrderByAnnoMaturazioneAsc(7L, 12L, 2L))
            .thenReturn(List.of(cohort(2L, 2025, "32", "20"), cohort(2L, LocalDate.now().getYear(), "32", "0")));

        SaldoAssenzaDto balance = service.getSaldi(12L).get(0);

        assertTrue(balance.saldoAnnuale());
        org.junit.jupiter.api.Assertions.assertEquals(new BigDecimal("32.00"), balance.residuoValido());
    }

    @Test
    void annualResetDoesNotExposePreviousHolidayCohortsAsExpired() {
        when(tipoRepository.findAllAttivi()).thenReturn(List.of(ferie));
        when(saldoRepository.findAllByTenantIdAndDriverIdAndTipoAssenzaIdOrderByAnnoMaturazioneAsc(7L, 12L, 1L))
            .thenReturn(List.of(cohort(LocalDate.now().getYear() - 1, "26", "10"),
                cohort(LocalDate.now().getYear(), "26", "4")));

        SaldoAssenzaDto balance = service.getSaldi(12L).get(0);

        assertEquals(new BigDecimal("22.00"), balance.residuoValido());
        assertEquals(new BigDecimal("0.00"), balance.residuoScaduto());
        assertEquals("azzeramento_annuale", balance.comportamentoMaturato());
    }

    @Test
    void annualResetDoesNotAllowRequestToUsePreviousHolidayCohort() {
        when(saldoRepository.findAllByTenantIdAndDriverIdAndTipoAssenzaIdOrderByAnnoMaturazioneAsc(7L, 12L, 1L))
            .thenReturn(List.of(cohort(LocalDate.now().getYear() - 1, "26", "0")));

        assertThrows(AssenzaValidationException.class, () -> service.richiedeApprovazioneEccezionale(
            12L, 1L, LocalDate.now().plusDays(1), LocalDate.now().plusDays(1), true, null, null));
    }

    @Test
    void extendedAccumulationAppliesToPermitsAndSeparatesExpiredCohorts() {
        TipoAssenzaEntity permesso = new TipoAssenzaEntity();
        ReflectionTestUtils.setField(permesso, "id", 2L);
        permesso.setCodice("PER");
        permesso.setNome("Permesso");
        permesso.setUnitaMisura(UnitaMisuraAssenza.ORE);
        permesso.setAttivo(true);
        when(tipoRepository.findAllAttivi()).thenReturn(List.of(permesso));
        when(configurazioneAssenzeService.resolveEffectiveConfiguration(12L, 2L))
            .thenReturn(config(2L, "32", "accumulo_esteso", 1));
        when(saldoRepository.findAllByTenantIdAndDriverIdAndTipoAssenzaIdOrderByAnnoMaturazioneAsc(7L, 12L, 2L))
            .thenReturn(List.of(cohort(2L, 2024, "32", "20"), cohort(2L, LocalDate.now().getYear(), "32", "4")));

        SaldoAssenzaDto balance = service.getSaldi(12L).get(0);

        assertEquals(new BigDecimal("28.00"), balance.residuoValido());
        assertEquals(new BigDecimal("12.00"), balance.residuoScaduto());
        assertEquals("accumulo_esteso", balance.comportamentoMaturato());
    }

    @Test
    void previewsAndAppliesCurrentYearCorrectionWithoutChangingUsedQuantity() {
        SaldoDriverEntity current = cohort(LocalDate.now().getYear(), "20", "5");
        when(saldoRepository.findByTenantIdAndDriverIdAndTipoAssenzaIdAndAnnoMaturazione(
            7L, 12L, 1L, LocalDate.now().getYear())).thenReturn(Optional.of(current));
        when(saldoRepository.findAllForUpdate(7L, 12L, 1L)).thenReturn(List.of(current));
        RettificaSaldoDto preview = service.previewRettifica(12L, 1L);
        assertEquals(new BigDecimal("20.00"), preview.maturatoAttuale());
        assertEquals(new BigDecimal("5.00"), preview.giaUtilizzato());
        assertEquals(new BigDecimal("26.00"), preview.maturatoDopoRettifica());
        assertTrue(preview.applicabile());

        RettificaSaldoDto updated = service.rettificaSaldoCorrente(12L, 1L, 99L);

        assertEquals(new BigDecimal("26.00"), current.getQuantitaMaturata());
        assertEquals(new BigDecimal("5"), current.getQuantitaUtilizzata());
        assertEquals(99L, current.getAggiornatoDa());
        assertEquals(new BigDecimal("26.00"), updated.maturatoDopoRettifica());
        verify(saldoRepository).save(current);
    }

    @Test
    void refusesCorrectionBelowAlreadyUsedQuantity() {
        when(configurazioneAssenzeService.resolveEffectiveConfiguration(12L, 1L))
            .thenReturn(config(1L, "4", "azzeramento_annuale", null));
        SaldoDriverEntity current = cohort(LocalDate.now().getYear(), "26", "5");
        when(saldoRepository.findAllForUpdate(7L, 12L, 1L)).thenReturn(List.of(current));

        assertThrows(AssenzaValidationException.class, () -> service.rettificaSaldoCorrente(12L, 1L, 99L));
    }

    private ConfigurazioneAssenzaDto config(Long typeId) {
        return config(typeId, "26", "azzeramento_annuale", null);
    }

    private ConfigurazioneAssenzaDto config(Long typeId, String annualAmount, String behavior, Integer months) {
        BigDecimal annual = new BigDecimal(annualAmount);
        return new ConfigurazioneAssenzaDto(typeId, "FER", "Ferie", "GIORNI", false, false,
            true, false, true, annual, null, behavior, months, 0, null,
            new ConfigurazioneAssenzaInput(true, false, true, annual, null, behavior, months, 0, null));
    }

    private SaldoDriverEntity cohort(int year, String accrued, String used) {
        return cohort(1L, year, accrued, used);
    }

    private SaldoDriverEntity cohort(long typeId, int year, String accrued, String used) {
        SaldoDriverEntity entity = new SaldoDriverEntity();
        entity.setTenantId(7L);
        entity.setDriverId(12L);
        entity.setTipoAssenzaId(typeId);
        entity.setAnnoMaturazione(year);
        entity.setQuantitaMaturata(new BigDecimal(accrued));
        entity.setQuantitaUtilizzata(new BigDecimal(used));
        return entity;
    }
}
