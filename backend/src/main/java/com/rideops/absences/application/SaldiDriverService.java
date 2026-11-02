package com.rideops.absences.application;

import com.rideops.absences.adapters.out.ConsumoSaldoAssenzaEntity;
import com.rideops.absences.adapters.out.ConsumoSaldoAssenzaRepository;
import com.rideops.absences.adapters.out.RichiestaAssenzaEntity;
import com.rideops.absences.adapters.out.SaldoDriverEntity;
import com.rideops.absences.adapters.out.SaldoDriverRepository;
import com.rideops.absences.adapters.out.TipoAssenzaEntity;
import com.rideops.identity.adapters.out.UserEntity;
import com.rideops.identity.application.admin.UserAdminRepositoryPort;
import com.rideops.identity.domain.UserRole;
import com.rideops.multitenancy.TenantContext;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SaldiDriverService {

    private static final BigDecimal ZERO = BigDecimal.ZERO.setScale(2);
    private static final BigDecimal MEZZA_GIORNATA = new BigDecimal("0.50");

    private final SaldoDriverRepository saldoRepository;
    private final ConsumoSaldoAssenzaRepository consumoRepository;
    private final ConfigurazioneAssenzeService configurazioneAssenzeService;
    private final TipoAssenzaRepositoryPort tipoAssenzaRepository;
    private final UserAdminRepositoryPort userRepository;
    private final TenantContext tenantContext;

    public SaldiDriverService(SaldoDriverRepository saldoRepository,
                              ConsumoSaldoAssenzaRepository consumoRepository,
                              ConfigurazioneAssenzeService configurazioneAssenzeService,
                              TipoAssenzaRepositoryPort tipoAssenzaRepository,
                              UserAdminRepositoryPort userRepository,
                              TenantContext tenantContext) {
        this.saldoRepository = saldoRepository;
        this.consumoRepository = consumoRepository;
        this.configurazioneAssenzeService = configurazioneAssenzeService;
        this.tipoAssenzaRepository = tipoAssenzaRepository;
        this.userRepository = userRepository;
        this.tenantContext = tenantContext;
    }

    @Transactional
    public List<SaldoAssenzaDto> getSaldi(long driverId) {
        long tenantId = tenantContext.requireTenantId();
        requireDriver(driverId, tenantId);
        int year = LocalDate.now().getYear();
        return tipoAssenzaRepository.findAllAttivi().stream()
            .map(tipo -> saldoDto(driverId, tenantId, tipo, LocalDate.now(), year))
            .toList();
    }

    @Transactional
    public RettificaSaldoDto previewRettifica(long driverId, long tipoAssenzaId) {
        long tenantId = tenantContext.requireTenantId();
        requireDriver(driverId, tenantId);
        TipoAssenzaEntity tipo = requireTipo(tipoAssenzaId);
        int year = LocalDate.now().getYear();
        ConfigurazioneAssenzaDto configurazione = configurazioneAssenzeService
            .resolveEffectiveConfiguration(driverId, tipoAssenzaId);
        ensureAnnualCohort(driverId, tenantId, tipo, year, configurazione);
        SaldoDriverEntity saldo = saldoRepository.findByTenantIdAndDriverIdAndTipoAssenzaIdAndAnnoMaturazione(
            tenantId, driverId, tipoAssenzaId, year).orElse(null);
        BigDecimal matured = saldo == null ? ZERO : saldo.getQuantitaMaturata();
        BigDecimal used = saldo == null ? ZERO : saldo.getQuantitaUtilizzata();
        BigDecimal configured = configuredAnnualAmount(tipo, configurazione);
        boolean applicable = isAnnualBalanceType(tipo) && configurazione.abilitato()
            && configurazione.monteOreAbilitato() && configurazione.numeroGiorniAnnui() != null
            && matured.compareTo(used) >= 0
            && configured.compareTo(used) >= 0;
        BigDecimal after = applicable ? configured.max(used) : matured;
        return new RettificaSaldoDto(driverId, tipoAssenzaId, tipo.getCodice(), tipo.getNome(), year,
            scale(matured), scale(used), scale(configured), scale(after), scale(after.subtract(matured)), applicable);
    }

    @Transactional
    public RettificaSaldoDto rettificaSaldoCorrente(long driverId, long tipoAssenzaId, long userId) {
        long tenantId = tenantContext.requireTenantId();
        requireDriver(driverId, tenantId);
        TipoAssenzaEntity tipo = requireTipo(tipoAssenzaId);
        int year = LocalDate.now().getYear();
        ConfigurazioneAssenzaDto configurazione = configurazioneAssenzeService
            .resolveEffectiveConfiguration(driverId, tipoAssenzaId);
        ensureAnnualCohort(driverId, tenantId, tipo, year, configurazione);
        SaldoDriverEntity saldo = saldoRepository.findAllForUpdate(tenantId, driverId, tipoAssenzaId).stream()
            .filter(item -> item.getAnnoMaturazione() == year)
            .findFirst()
            .orElseThrow(() -> new AssenzaValidationException("Saldo annuale corrente non disponibile per la rettifica"));
        BigDecimal configured = configuredAnnualAmount(tipo, configurazione);
        if (!isAnnualBalanceType(tipo) || !configurazione.abilitato() || !configurazione.monteOreAbilitato()
            || configurazione.numeroGiorniAnnui() == null) {
            throw new AssenzaValidationException("Il tipo non prevede una rettifica di saldo annuale");
        }
        if (configured.compareTo(saldo.getQuantitaUtilizzata()) < 0) {
            throw new AssenzaValidationException("La quota configurata non può essere inferiore al saldo già utilizzato");
        }
        saldo.setQuantitaMaturata(configured);
        saldo.setAggiornatoDa(userId);
        saldoRepository.save(saldo);
        return previewRettifica(driverId, tipoAssenzaId);
    }

    @Transactional
    public boolean richiedeApprovazioneEccezionale(long driverId,
                                                    long tipoAssenzaId,
                                                    LocalDate dataInizio,
                                                    LocalDate dataFine,
                                                    boolean giornataIntera,
                                                    LocalTime oraInizio,
                                                    LocalTime oraFine) {
        long tenantId = tenantContext.requireTenantId();
        requireDriver(driverId, tenantId);
        TipoAssenzaEntity tipo = requireTipo(tipoAssenzaId);
        ConfigurazioneAssenzaDto configurazione = configurazioneAssenzeService
            .resolveEffectiveConfiguration(driverId, tipoAssenzaId);
        if (!configurazione.abilitato()) {
            throw new AssenzaValidationException("Il tipo di assenza non è abilitato per questo driver");
        }
        if (!configurazione.monteOreAbilitato()) {
            return false;
        }

        BigDecimal quantita = calculateQuantity(tipo, dataInizio, dataFine, giornataIntera, oraInizio, oraFine);
        ensureAnnualCohort(driverId, tenantId, tipo, dataInizio.getYear());
        List<SaldoDriverEntity> cohorts = saldoRepository
            .findAllByTenantIdAndDriverIdAndTipoAssenzaIdOrderByAnnoMaturazioneAsc(tenantId, driverId, tipoAssenzaId);
        BalanceTotals totals = totals(cohorts, configurazione, dataInizio, tipo);
        if (totals.total().compareTo(quantita) < 0) {
            throw new AssenzaValidationException("Saldo residuo insufficiente per il tipo di assenza selezionato");
        }
        return totals.valid().compareTo(quantita) < 0 && totals.expired().signum() > 0;
    }

    @Transactional
    public void consuma(RichiestaAssenzaEntity richiesta) {
        long tenantId = tenantContext.requireTenantId();
        TipoAssenzaEntity tipo = requireTipo(richiesta.getTipoAssenzaId());
        ConfigurazioneAssenzaDto configurazione = configurazioneAssenzeService
            .resolveEffectiveConfiguration(richiesta.getDriverId(), richiesta.getTipoAssenzaId());
        if (!configurazione.abilitato()) {
            throw new AssenzaValidationException("Il tipo di assenza non è abilitato per questo driver");
        }
        if (!configurazione.monteOreAbilitato()) {
            return;
        }

        ensureAnnualCohort(richiesta.getDriverId(), tenantId, tipo, richiesta.getDataInizio().getYear());

        BigDecimal quantita = calculateQuantity(tipo, richiesta.getDataInizio(), richiesta.getDataFine(),
            richiesta.isGiornataIntera(), richiesta.getOraInizio(), richiesta.getOraFine());
        List<SaldoDriverEntity> cohorts = saldoRepository.findAllForUpdate(
            tenantId, richiesta.getDriverId(), richiesta.getTipoAssenzaId());
        BalanceTotals totals = totals(cohorts, configurazione, richiesta.getDataInizio(), tipo);
        if (totals.total().compareTo(quantita) < 0) {
            throw new AssenzaValidationException("Saldo residuo insufficiente al momento dell'approvazione");
        }
        boolean wouldUseExpired = totals.valid().compareTo(quantita) < 0;
        if (wouldUseExpired && !richiesta.isRichiedeApprovazioneEccezionale()) {
            throw new AssenzaValidationException("La quota maturata oltre la scadenza richiede una conferma esplicita");
        }

        List<SaldoDriverEntity> ordered = cohorts.stream()
            .filter(saldo -> carriesOver(tipo, configurazione)
                || saldo.getAnnoMaturazione() == richiesta.getDataInizio().getYear())
            .sorted(Comparator.comparing((SaldoDriverEntity saldo) -> {
                    LocalDate expiry = expiredAt(saldo.getAnnoMaturazione(), configurazione, tipo);
                    return expiry != null && richiesta.getDataInizio().isAfter(expiry);
                })
                .thenComparing(saldo -> expiredAt(saldo.getAnnoMaturazione(), configurazione, tipo),
                    Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparingInt(saldo -> saldo.getAnnoMaturazione()))
            .toList();
        BigDecimal remaining = quantita;
        List<Allocation> allocations = new ArrayList<>();
        for (SaldoDriverEntity cohort : ordered) {
            BigDecimal available = cohort.getQuantitaMaturata().subtract(cohort.getQuantitaUtilizzata());
            if (available.signum() <= 0) continue;
            BigDecimal allocation = available.min(remaining);
            cohort.setQuantitaUtilizzata(cohort.getQuantitaUtilizzata().add(allocation));
            SaldoDriverEntity savedCohort = saldoRepository.save(cohort);
            allocations.add(new Allocation(savedCohort, allocation));
            remaining = remaining.subtract(allocation);
            if (remaining.signum() <= 0) break;
        }

        for (Allocation allocation : allocations) {
            ConsumoSaldoAssenzaEntity consumo = new ConsumoSaldoAssenzaEntity();
            consumo.setRichiestaAssenzaId(richiesta.getId());
            consumo.setSaldoDriverId(allocation.saldo().getId());
            consumo.setQuantita(allocation.quantita());
            consumoRepository.save(consumo);
        }
    }

    @Transactional
    public void stornaConsumo(long richiestaId) {
        for (ConsumoSaldoAssenzaEntity consumo : consumoRepository.findAllByRichiestaAssenzaIdAndStornatoFalse(richiestaId)) {
            SaldoDriverEntity saldo = saldoRepository.findById(consumo.getSaldoDriverId().longValue())
                .orElseThrow(() -> new AssenzaNotFoundException("Lotto saldo non trovato per storno"));
            saldo.setQuantitaUtilizzata(saldo.getQuantitaUtilizzata().subtract(consumo.getQuantita()).max(ZERO));
            saldoRepository.save(saldo);
            consumo.setStornato(true);
            consumoRepository.save(consumo);
        }
    }

    private SaldoAssenzaDto saldoDto(long driverId, long tenantId, TipoAssenzaEntity tipo, LocalDate asOf, int year) {
        ConfigurazioneAssenzaDto configurazione = configurazioneAssenzeService
            .resolveEffectiveConfiguration(driverId, tipo.getId());
        ensureAnnualCohort(driverId, tenantId, tipo, year, configurazione);
        List<SaldoDriverEntity> cohorts = saldoRepository
            .findAllByTenantIdAndDriverIdAndTipoAssenzaIdOrderByAnnoMaturazioneAsc(tenantId, driverId, tipo.getId());
        BalanceTotals totals = totals(cohorts, configurazione, asOf, tipo);
        BigDecimal maturata = BigDecimal.ZERO;
        BigDecimal utilizzata = BigDecimal.ZERO;
        for (SaldoDriverEntity cohort : cohorts) {
            if (!carriesOver(tipo, configurazione) && cohort.getAnnoMaturazione() != year) continue;
            maturata = maturata.add(cohort.getQuantitaMaturata());
            utilizzata = utilizzata.add(cohort.getQuantitaUtilizzata());
        }
        return new SaldoAssenzaDto(tipo.getId(), tipo.getCodice(), tipo.getNome(), tipo.getUnitaMisura().name(),
            scale(maturata), scale(utilizzata), scale(totals.valid()), scale(totals.expired()),
            isAnnualBalanceType(tipo) && configurazione.abilitato() && configurazione.monteOreAbilitato()
                && configurazione.numeroGiorniAnnui() != null,
            !cohorts.isEmpty(), configurazione.monteOreAbilitato(), configurazione.comportamentoMaturato(),
            configurazione.scadenzaMesiAccumulo());
    }

    private BalanceTotals totals(List<SaldoDriverEntity> cohorts,
                                 ConfigurazioneAssenzaDto configurazione,
                                 LocalDate asOf,
                                 TipoAssenzaEntity tipo) {
        BigDecimal valid = BigDecimal.ZERO;
        BigDecimal expired = BigDecimal.ZERO;
        for (SaldoDriverEntity cohort : cohorts) {
            if (!carriesOver(tipo, configurazione) && cohort.getAnnoMaturazione() != asOf.getYear()) continue;
            BigDecimal residuo = cohort.getQuantitaMaturata().subtract(cohort.getQuantitaUtilizzata()).max(BigDecimal.ZERO);
            LocalDate expires = expiredAt(cohort.getAnnoMaturazione(), configurazione, tipo);
            if (expires != null && asOf.isAfter(expires)) expired = expired.add(residuo);
            else valid = valid.add(residuo);
        }
        return new BalanceTotals(valid, expired);
    }

    private void ensureAnnualCohort(long driverId, long tenantId, TipoAssenzaEntity tipo, int year) {
        ConfigurazioneAssenzaDto configurazione = configurazioneAssenzeService
            .resolveEffectiveConfiguration(driverId, tipo.getId());
        ensureAnnualCohort(driverId, tenantId, tipo, year, configurazione);
    }

    private void ensureAnnualCohort(long driverId,
                                    long tenantId,
                                    TipoAssenzaEntity tipo,
                                    int year,
                                    ConfigurazioneAssenzaDto configurazione) {
        if (!configurazione.abilitato() || !configurazione.monteOreAbilitato() || !isAnnualBalanceType(tipo)) return;
        BigDecimal annualAmount = configurazione.numeroGiorniAnnui();
        if (annualAmount == null || annualAmount.signum() < 0) return;
        saldoRepository.insertCohortIfMissing(tenantId, driverId, tipo.getId(), year, scale(annualAmount));
    }

    private boolean isAnnualBalanceType(TipoAssenzaEntity tipo) {
        return "FER".equals(tipo.getCodice()) || "PER".equals(tipo.getCodice());
    }

    private boolean carriesOver(TipoAssenzaEntity tipo, ConfigurazioneAssenzaDto configurazione) {
        return isMaturedBalanceType(tipo) && "accumulo_esteso".equals(configurazione.comportamentoMaturato());
    }

    private BigDecimal configuredAnnualAmount(TipoAssenzaEntity tipo, ConfigurazioneAssenzaDto configurazione) {
        if (!isAnnualBalanceType(tipo) || configurazione.numeroGiorniAnnui() == null) return ZERO;
        return scale(configurazione.numeroGiorniAnnui());
    }

    private LocalDate expiredAt(int year, ConfigurazioneAssenzaDto configurazione, TipoAssenzaEntity tipo) {
        if (!isMaturedBalanceType(tipo) || !"accumulo_esteso".equals(configurazione.comportamentoMaturato())) return null;
        int months = configurazione.scadenzaMesiAccumulo() == null ? 18 : configurazione.scadenzaMesiAccumulo();
        return LocalDate.of(year, 12, 31).plusMonths(months);
    }

    private boolean isMaturedBalanceType(TipoAssenzaEntity tipo) {
        return "FER".equals(tipo.getCodice()) || "PER".equals(tipo.getCodice()) || "RIP".equals(tipo.getCodice());
    }

    private BigDecimal calculateQuantity(TipoAssenzaEntity tipo,
                                         LocalDate start,
                                         LocalDate end,
                                         boolean fullDay,
                                         LocalTime from,
                                         LocalTime to) {
        long days = java.time.temporal.ChronoUnit.DAYS.between(start, end) + 1;
        if (tipo.getUnitaMisura() == com.rideops.absences.domain.UnitaMisuraAssenza.ORE) {
            if (from == null || to == null) throw new AssenzaValidationException("Orario richiesto per calcolare il saldo in ore");
            long minutes = java.time.Duration.between(from, to).toMinutes();
            if (minutes <= 0) throw new AssenzaValidationException("Intervallo orario non valido");
            return BigDecimal.valueOf(days).multiply(BigDecimal.valueOf(minutes))
                .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_UP);
        }
        return BigDecimal.valueOf(days).multiply(fullDay ? BigDecimal.ONE : MEZZA_GIORNATA).setScale(2, RoundingMode.HALF_UP);
    }

    private TipoAssenzaEntity requireTipo(long id) {
        return tipoAssenzaRepository.findById(id)
            .orElseThrow(() -> new AssenzaNotFoundException("Tipo di assenza non trovato"));
    }

    private UserEntity requireDriver(long driverId, long tenantId) {
        UserEntity driver = userRepository.findById(driverId)
            .orElseThrow(() -> new AssenzaNotFoundException("Driver non trovato"));
        if (driver.getTenantId() == null || driver.getTenantId().longValue() != tenantId
            || driver.getRole() != UserRole.DRIVER || !driver.isEnabled()) {
            throw new AssenzaNotFoundException("Driver non trovato");
        }
        return driver;
    }

    private BigDecimal scale(BigDecimal value) { return value.setScale(2, RoundingMode.HALF_UP); }

    private record BalanceTotals(BigDecimal valid, BigDecimal expired) {
        BigDecimal total() { return valid.add(expired); }
    }

    private record Allocation(SaldoDriverEntity saldo, BigDecimal quantita) { }
}