package com.rideops.absences.application;

import com.rideops.absences.adapters.out.ConfigurazioneAssenzaDriverEntity;
import com.rideops.absences.adapters.out.ConfigurazioneAssenzaDriverRepository;
import com.rideops.absences.adapters.out.ConfigurazioneAssenzaTenantEntity;
import com.rideops.absences.adapters.out.ConfigurazioneAssenzaTenantRepository;
import com.rideops.absences.adapters.out.RegoleGeneraliAssenzaTenantEntity;
import com.rideops.absences.adapters.out.RegoleGeneraliAssenzaTenantRepository;
import com.rideops.absences.adapters.out.TipoAssenzaEntity;
import com.rideops.identity.adapters.out.UserEntity;
import com.rideops.identity.application.admin.UserAdminRepositoryPort;
import com.rideops.identity.domain.UserRole;
import com.rideops.multitenancy.TenantContext;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ConfigurazioneAssenzeService implements RegoleGeneraliAssenzaProvider {

    private static final String DEFAULT_CONFLITTI = "SEGNALA";
    private static final Set<String> COMPORTAMENTI_CONFLITTO = Set.of("SEGNALA", "SEGNALA_E_BLOCCA");
    private static final String DEFAULT_COMPORTAMENTO_MATURATO = "azzeramento_annuale";
    private static final Set<String> COMPORTAMENTI_MATURATO = Set.of("azzeramento_annuale", "accumulo_esteso");

    private final ConfigurazioneAssenzaTenantRepository tenantRepository;
    private final RegoleGeneraliAssenzaTenantRepository regoleRepository;
    private final ConfigurazioneAssenzaDriverRepository driverConfigurationRepository;
    private final TipoAssenzaRepositoryPort tipoAssenzaRepository;
    private final UserAdminRepositoryPort userAdminRepository;
    private final ListDriversForAssenzeUseCase listDriversForAssenzeUseCase;
    private final TenantContext tenantContext;

    public ConfigurazioneAssenzeService(ConfigurazioneAssenzaTenantRepository tenantRepository,
                                        RegoleGeneraliAssenzaTenantRepository regoleRepository,
                                        ConfigurazioneAssenzaDriverRepository driverConfigurationRepository,
                                        TipoAssenzaRepositoryPort tipoAssenzaRepository,
                                        UserAdminRepositoryPort userAdminRepository,
                                        ListDriversForAssenzeUseCase listDriversForAssenzeUseCase,
                                        TenantContext tenantContext) {
        this.tenantRepository = tenantRepository;
        this.regoleRepository = regoleRepository;
        this.driverConfigurationRepository = driverConfigurationRepository;
        this.tipoAssenzaRepository = tipoAssenzaRepository;
        this.userAdminRepository = userAdminRepository;
        this.listDriversForAssenzeUseCase = listDriversForAssenzeUseCase;
        this.tenantContext = tenantContext;
    }

    @Transactional(readOnly = true)
    public List<ConfigurazioneAssenzaDto> listTenantConfigurations() {
        long tenantId = tenantContext.requireTenantId();
        Map<Long, ConfigurazioneAssenzaTenantEntity> saved = new HashMap<>();
        tenantRepository.findAllByTenantId(tenantId).forEach(item -> saved.put(item.getTipoAssenzaId(), item));
        return tipoAssenzaRepository.findAllAttivi().stream()
            .map(tipo -> toTenantDto(tipo, saved.get(tipo.getId())))
            .toList();
    }

    @Transactional
    public ConfigurazioneAssenzaDto saveTenantConfiguration(long tipoAssenzaId,
                                                             ConfigurazioneAssenzaInput input,
                                                             long userId) {
        long tenantId = tenantContext.requireTenantId();
        TipoAssenzaEntity tipo = requireTipo(tipoAssenzaId);
        validateInput(input, tipo);
        ConfigurazioneAssenzaTenantEntity entity = tenantRepository
            .findByTenantIdAndTipoAssenzaId(tenantId, tipoAssenzaId)
            .orElseGet(ConfigurazioneAssenzaTenantEntity::new);
        entity.setTenantId(tenantId);
        entity.setTipoAssenzaId(tipoAssenzaId);
        entity.setAggiornatoDa(userId);
        copyInput(input, entity);
        return toTenantDto(tipo, tenantRepository.save(entity));
    }

    @Transactional
    public void resetTenantConfiguration(long tipoAssenzaId) {
        long tenantId = tenantContext.requireTenantId();
        requireTipo(tipoAssenzaId);
        tenantRepository.deleteByTenantIdAndTipoAssenzaId(tenantId, tipoAssenzaId);
    }

    @Transactional(readOnly = true)
    @Override
    public RegoleGeneraliAssenzaDto getGeneralRules() {
        long tenantId = tenantContext.requireTenantId();
        String current = regoleRepository.findById(tenantId)
            .map(entity -> entity.getComportamentoConflittoTurni())
            .orElse(DEFAULT_CONFLITTI);
        return new RegoleGeneraliAssenzaDto(current, DEFAULT_CONFLITTI);
    }

    @Transactional
    public RegoleGeneraliAssenzaDto saveGeneralRules(String comportamento, long userId) {
        if (!COMPORTAMENTI_CONFLITTO.contains(comportamento)) {
            throw new AssenzaValidationException("Comportamento conflitti non valido");
        }
        long tenantId = tenantContext.requireTenantId();
        RegoleGeneraliAssenzaTenantEntity entity = regoleRepository.findById(tenantId)
            .orElseGet(RegoleGeneraliAssenzaTenantEntity::new);
        entity.setTenantId(tenantId);
        entity.setAggiornatoDa(userId);
        entity.setComportamentoConflittoTurni(comportamento);
        RegoleGeneraliAssenzaTenantEntity saved = regoleRepository.save(entity);
        return new RegoleGeneraliAssenzaDto(saved.getComportamentoConflittoTurni(), DEFAULT_CONFLITTI);
    }

    @Transactional(readOnly = true)
    public List<ConfigurazioneDriverAssenzaDto> listDriverConfigurations(long tipoAssenzaId) {
        long tenantId = tenantContext.requireTenantId();
        TipoAssenzaEntity tipo = requireTipo(tipoAssenzaId);
        ConfigurazioneAssenzaDto tenantConfig = toTenantDto(tipo,
            tenantRepository.findByTenantIdAndTipoAssenzaId(tenantId, tipoAssenzaId).orElse(null));
        Map<Long, ConfigurazioneAssenzaDriverEntity> exceptions = new HashMap<>();
        driverConfigurationRepository.findAllByTenantIdAndTipoAssenzaId(tenantId, tipoAssenzaId)
            .forEach(item -> exceptions.put(item.getDriverId(), item));

        return listDriversForAssenzeUseCase.execute().stream()
            .map(driver -> {
                ConfigurazioneAssenzaDriverEntity exception = exceptions.get(driver.driverId());
                ConfigurazioneAssenzaDto effective = exception == null
                    ? tenantConfig
                    : toDriverDto(tipo, exception);
                return new ConfigurazioneDriverAssenzaDto(
                    driver.driverId(), driver.firstName(), driver.lastName(), exception != null, effective);
            })
            .toList();
    }

    @Transactional(readOnly = true)
    public ConfigurazioneDriverAssenzaDto getDriverConfiguration(long driverId, long tipoAssenzaId) {
        long tenantId = tenantContext.requireTenantId();
        UserEntity driver = requireDriver(driverId, tenantId);
        TipoAssenzaEntity tipo = requireTipo(tipoAssenzaId);
        ConfigurazioneAssenzaDriverEntity exception = driverConfigurationRepository
            .findByTenantIdAndDriverIdAndTipoAssenzaId(tenantId, driverId, tipoAssenzaId)
            .orElse(null);
        ConfigurazioneAssenzaDto config = exception == null
            ? toTenantDto(tipo, tenantRepository.findByTenantIdAndTipoAssenzaId(tenantId, tipoAssenzaId).orElse(null))
            : toDriverDto(tipo, exception);
        return new ConfigurazioneDriverAssenzaDto(
            driver.getId(), driver.getFirstName(), driver.getLastName(), exception != null, config);
    }

    @Transactional(readOnly = true)
    public ConfigurazioneAssenzaDto resolveEffectiveConfiguration(long driverId, long tipoAssenzaId) {
        return getDriverConfiguration(driverId, tipoAssenzaId).configurazioneEffettiva();
    }

    @Transactional
    public ConfigurazioneDriverAssenzaDto saveDriverConfiguration(long driverId,
                                                                   long tipoAssenzaId,
                                                                   ConfigurazioneAssenzaInput input,
                                                                   long userId) {
        long tenantId = tenantContext.requireTenantId();
        UserEntity driver = requireDriver(driverId, tenantId);
        TipoAssenzaEntity tipo = requireTipo(tipoAssenzaId);
        validateInput(input, tipo);
        ConfigurazioneAssenzaDriverEntity entity = driverConfigurationRepository
            .findByTenantIdAndDriverIdAndTipoAssenzaId(tenantId, driverId, tipoAssenzaId)
            .orElseGet(ConfigurazioneAssenzaDriverEntity::new);
        entity.setTenantId(tenantId);
        entity.setDriverId(driverId);
        entity.setTipoAssenzaId(tipoAssenzaId);
        if (entity.getCreatoDa() == null) {
            entity.setCreatoDa(userId);
        }
        entity.setMotivo(input.noteConfigurazione());
        copyInput(input, entity);
        driverConfigurationRepository.save(entity);
        return getDriverConfiguration(driver.getId(), tipoAssenzaId);
    }

    @Transactional
    public void resetDriverConfiguration(long driverId, long tipoAssenzaId) {
        long tenantId = tenantContext.requireTenantId();
        requireDriver(driverId, tenantId);
        requireTipo(tipoAssenzaId);
        driverConfigurationRepository.deleteByTenantIdAndDriverIdAndTipoAssenzaId(tenantId, driverId, tipoAssenzaId);
    }

    @Transactional
    public List<ConfigurazioneDriverAssenzaDto> applyBulk(long tipoAssenzaId,
                                                          @Nullable List<Long> driverIds,
                                                          ConfigurazioneAssenzaInput input,
                                                          long userId) {
        long tenantId = tenantContext.requireTenantId();
        TipoAssenzaEntity tipo = requireTipo(tipoAssenzaId);
        validateInput(input, tipo);
        List<Long> uniqueIds = validatedDriverIds(driverIds, tenantId);
        for (Long driverId : uniqueIds) {
            ConfigurazioneAssenzaDriverEntity entity = driverConfigurationRepository
                .findByTenantIdAndDriverIdAndTipoAssenzaId(tenantId, driverId, tipoAssenzaId)
                .orElseGet(ConfigurazioneAssenzaDriverEntity::new);
            entity.setTenantId(tenantId);
            entity.setDriverId(driverId);
            entity.setTipoAssenzaId(tipoAssenzaId);
            if (entity.getCreatoDa() == null) {
                entity.setCreatoDa(userId);
            }
            entity.setMotivo(input.noteConfigurazione());
            copyInput(input, entity);
            driverConfigurationRepository.save(entity);
        }
        return listDriverConfigurations(tipo.getId()).stream()
            .filter(item -> uniqueIds.contains(item.driverId()) )
            .toList();
    }

    @Transactional
    public void resetBulk(long tipoAssenzaId, @Nullable List<Long> driverIds) {
        long tenantId = tenantContext.requireTenantId();
        requireTipo(tipoAssenzaId);
        List<Long> uniqueIds = validatedDriverIds(driverIds, tenantId);
        driverConfigurationRepository.deleteAllByTenantIdAndDriverIdInAndTipoAssenzaId(tenantId, uniqueIds, tipoAssenzaId);
    }

    private List<Long> validatedDriverIds(@Nullable List<Long> driverIds, long tenantId) {
        if (driverIds == null || driverIds.isEmpty() || driverIds.size() > 100) {
            throw new AssenzaValidationException("Seleziona da 1 a 100 driver");
        }
        List<Long> uniqueIds = new ArrayList<>(new HashSet<>(driverIds));
        if (uniqueIds.contains(null)) {
            throw new AssenzaValidationException("Selezione driver non valida");
        }
        for (Long id : uniqueIds) {
            if (id == null) {
                throw new AssenzaValidationException("Selezione driver non valida");
            }
            requireDriver(id, tenantId);
        }
        return uniqueIds;
    }

    private UserEntity requireDriver(long driverId, long tenantId) {
        UserEntity driver = userAdminRepository.findById(driverId)
            .orElseThrow(() -> new AssenzaNotFoundException("Driver non trovato"));
        if (driver.getTenantId() == null || driver.getTenantId().longValue() != tenantId
            || driver.getRole() != UserRole.DRIVER || !driver.isEnabled()) {
            throw new AssenzaValidationException("Il driver non è disponibile per la configurazione assenze");
        }
        return driver;
    }

    private TipoAssenzaEntity requireTipo(long tipoAssenzaId) {
        return tipoAssenzaRepository.findById(tipoAssenzaId)
            .filter(tipo -> tipo.isAttivo())
            .orElseThrow(() -> new AssenzaNotFoundException("Tipo di assenza non trovato o non attivo"));
    }

    private void validateInput(ConfigurazioneAssenzaInput input, TipoAssenzaEntity tipo) {
        boolean maturedBalanceType = isMaturedBalanceType(tipo);
        if (input == null || input.abilitato() == null || input.richiedeDocumento() == null
            || input.monteOreAbilitato() == null || input.preavvisoMinimoGiorni() == null
            || input.preavvisoMinimoGiorni() < 0 || negative(input.numeroGiorniAnnui())
            || negative(input.numeroGiorniMalattiaAnnui())
            || (input.comportamentoMaturato() != null && !COMPORTAMENTI_MATURATO.contains(input.comportamentoMaturato()))
            || (input.scadenzaMesiAccumulo() != null && input.scadenzaMesiAccumulo() < 1)
            || (!maturedBalanceType && input.comportamentoMaturato() != null
                && !DEFAULT_COMPORTAMENTO_MATURATO.equals(input.comportamentoMaturato()))
            || (!maturedBalanceType && input.scadenzaMesiAccumulo() != null)) {
            throw new AssenzaValidationException("Valori di configurazione non validi");
        }
    }

    private boolean isMaturedBalanceType(TipoAssenzaEntity tipo) {
        return Set.of("FER", "PER", "RIP").contains(tipo.getCodice());
    }

    private boolean negative(BigDecimal value) {
        return value != null && value.signum() < 0;
    }

    private ConfigurazioneAssenzaDto toTenantDto(TipoAssenzaEntity tipo, ConfigurazioneAssenzaTenantEntity entity) {
        ConfigurazioneAssenzaInput defaults = platformDefaults(tipo);
        ConfigurazioneAssenzaInput values = entity == null ? defaults : new ConfigurazioneAssenzaInput(
            entity.isAbilitato(), entity.isRichiedeDocumento(), entity.isMonteOreAbilitato(),
            entity.getNumeroGiorniAnnui(), entity.getNumeroGiorniMalattiaAnnui(), entity.getComportamentoMaturato(),
            entity.getScadenzaMesiAccumulo(),
            entity.getPreavvisoMinimoGiorni(), entity.getNoteConfigurazione());
        boolean customized = entity != null && !sameConfiguration(values, defaults);
        return dto(tipo, values, customized, defaults);
    }

    private ConfigurazioneAssenzaDto toDriverDto(TipoAssenzaEntity tipo, ConfigurazioneAssenzaDriverEntity entity) {
        ConfigurazioneAssenzaInput defaults = platformDefaults(tipo);
        ConfigurazioneAssenzaInput values = new ConfigurazioneAssenzaInput(
            entity.isAbilitato(), entity.isRichiedeDocumento(), entity.isMonteOreAbilitato(),
            entity.getNumeroGiorniAnnui(), entity.getNumeroGiorniMalattiaAnnui(), entity.getComportamentoMaturato(),
            entity.getScadenzaMesiAccumulo(),
            entity.getPreavvisoMinimoGiorni(), entity.getMotivo());
        return dto(tipo, values, true, defaults);
    }

    private ConfigurazioneAssenzaDto dto(TipoAssenzaEntity tipo,
                                         ConfigurazioneAssenzaInput values,
                                         boolean customized,
                                         ConfigurazioneAssenzaInput defaults) {
        return new ConfigurazioneAssenzaDto(
            tipo.getId(), tipo.getCodice(), tipo.getNome(), tipo.getUnitaMisura().name(), tipo.isRichiedeOrario(),
            customized, values.abilitato(), values.richiedeDocumento(), values.monteOreAbilitato(),
            values.numeroGiorniAnnui(), values.numeroGiorniMalattiaAnnui(), values.comportamentoMaturato(),
            values.scadenzaMesiAccumulo(),
            values.preavvisoMinimoGiorni(), values.noteConfigurazione(), defaults);
    }

    private ConfigurazioneAssenzaInput platformDefaults(TipoAssenzaEntity tipo) {
        return new ConfigurazioneAssenzaInput(
            true,
            tipo.isRichiedeDocumentoDefault(),
            tipo.isScalaDaMonteOreDefault(),
            tipo.getNumeroGiorniAnnuiDefault(),
            tipo.getNumeroGiorniMalattiaAnnuiDefault(),
            DEFAULT_COMPORTAMENTO_MATURATO,
            isMaturedBalanceType(tipo) ? tipo.getScadenzaMesiAccumuloDefault() : null,
            tipo.getPreavvisoMinimoGiorniDefault(),
            null
        );
    }

    private boolean sameConfiguration(ConfigurazioneAssenzaInput first, ConfigurazioneAssenzaInput second) {
        return Objects.equals(first.abilitato(), second.abilitato())
            && Objects.equals(first.richiedeDocumento(), second.richiedeDocumento())
            && Objects.equals(first.monteOreAbilitato(), second.monteOreAbilitato())
            && sameDecimal(first.numeroGiorniAnnui(), second.numeroGiorniAnnui())
            && sameDecimal(first.numeroGiorniMalattiaAnnui(), second.numeroGiorniMalattiaAnnui())
            && Objects.equals(first.comportamentoMaturato(), second.comportamentoMaturato())
            && (!"accumulo_esteso".equals(first.comportamentoMaturato())
                || Objects.equals(first.scadenzaMesiAccumulo(), second.scadenzaMesiAccumulo()))
            && Objects.equals(first.preavvisoMinimoGiorni(), second.preavvisoMinimoGiorni())
            && Objects.equals(first.noteConfigurazione(), second.noteConfigurazione());
    }

    private boolean sameDecimal(BigDecimal first, BigDecimal second) {
        return first == null ? second == null : second != null && first.compareTo(second) == 0;
    }

    private void copyInput(ConfigurazioneAssenzaInput input, ConfigurazioneAssenzaTenantEntity target) {
        target.setAbilitato(input.abilitato());
        target.setRichiedeDocumento(input.richiedeDocumento());
        target.setMonteOreAbilitato(input.monteOreAbilitato());
        target.setNumeroGiorniAnnui(input.numeroGiorniAnnui());
        target.setNumeroGiorniMalattiaAnnui(input.numeroGiorniMalattiaAnnui());
        target.setComportamentoMaturato(input.comportamentoMaturato() == null
            ? DEFAULT_COMPORTAMENTO_MATURATO : input.comportamentoMaturato());
        target.setScadenzaMesiAccumulo("accumulo_esteso".equals(input.comportamentoMaturato())
            ? input.scadenzaMesiAccumulo() == null ? 18 : input.scadenzaMesiAccumulo()
            : null);
        target.setPreavvisoMinimoGiorni(input.preavvisoMinimoGiorni());
        target.setNoteConfigurazione(input.noteConfigurazione());
    }

    private void copyInput(ConfigurazioneAssenzaInput input, ConfigurazioneAssenzaDriverEntity target) {
        target.setAbilitato(input.abilitato());
        target.setRichiedeDocumento(input.richiedeDocumento());
        target.setMonteOreAbilitato(input.monteOreAbilitato());
        target.setNumeroGiorniAnnui(input.numeroGiorniAnnui());
        target.setNumeroGiorniMalattiaAnnui(input.numeroGiorniMalattiaAnnui());
        target.setComportamentoMaturato(input.comportamentoMaturato() == null
            ? DEFAULT_COMPORTAMENTO_MATURATO : input.comportamentoMaturato());
        target.setScadenzaMesiAccumulo("accumulo_esteso".equals(input.comportamentoMaturato())
            ? input.scadenzaMesiAccumulo() == null ? 18 : input.scadenzaMesiAccumulo()
            : null);
        target.setPreavvisoMinimoGiorni(input.preavvisoMinimoGiorni());
    }
}