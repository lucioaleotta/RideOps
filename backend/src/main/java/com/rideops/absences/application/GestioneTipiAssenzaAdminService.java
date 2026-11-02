package com.rideops.absences.application;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.rideops.absences.adapters.out.AuditTipoAssenzaDefaultEntity;
import com.rideops.absences.adapters.out.AuditTipoAssenzaDefaultRepository;
import com.rideops.absences.adapters.out.TipoAssenzaEntity;
import com.rideops.identity.adapters.out.UserEntity;
import com.rideops.identity.application.admin.UserAdminRepositoryPort;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.lang.Nullable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GestioneTipiAssenzaAdminService {

    private final TipoAssenzaRepositoryPort tipoAssenzaRepository;
    private final AuditTipoAssenzaDefaultRepository auditRepository;
    private final UserAdminRepositoryPort userAdminRepository;
    private final ObjectMapper objectMapper;

    public GestioneTipiAssenzaAdminService(TipoAssenzaRepositoryPort tipoAssenzaRepository,
                                           AuditTipoAssenzaDefaultRepository auditRepository,
                                           UserAdminRepositoryPort userAdminRepository,
                                           ObjectMapper objectMapper) {
        this.tipoAssenzaRepository = tipoAssenzaRepository;
        this.auditRepository = auditRepository;
        this.userAdminRepository = userAdminRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public List<TipoAssenzaDto> listAll() {
        return tipoAssenzaRepository.findAll().stream().map(RichiestaAssenzaMapper::toDto).toList();
    }

    @Transactional
    public TipoAssenzaDto create(CreaTipoAssenzaInput input, long adminId) {
        validateNumericDefaults(input.numeroGiorniAnnuiDefault(), input.numeroGiorniMalattiaAnnuiDefault(), input.scadenzaMesiAccumuloDefault());
        if (tipoAssenzaRepository.findByCodice(input.codice().trim()).isPresent()) {
            throw new AssenzaValidationException("Esiste già un tipo di assenza con questo codice");
        }
        if (!input.origineDriverConsentita() && !input.origineGestionaleConsentita()) {
            throw new AssenzaValidationException("Il tipo deve essere consentito almeno a un profilo");
        }

        TipoAssenzaEntity entity = new TipoAssenzaEntity();
        entity.setCodice(input.codice().trim());
        entity.setNome(input.nome().trim());
        entity.setUnitaMisura(input.unitaMisura());
        entity.setOrigineDriverConsentita(input.origineDriverConsentita());
        entity.setOrigineGestionaleConsentita(input.origineGestionaleConsentita());
        entity.setRichiedeOrario(input.richiedeOrario());
        entity.setRichiedeDocumentoDefault(input.richiedeDocumentoDefault());
        entity.setScalaDaMonteOreDefault(input.scalaDaMonteOreDefault());
        entity.setPreavvisoMinimoGiorniDefault(input.preavvisoMinimoGiorniDefault());
        entity.setNumeroGiorniAnnuiDefault(input.numeroGiorniAnnuiDefault());
        entity.setNumeroGiorniMalattiaAnnuiDefault(input.numeroGiorniMalattiaAnnuiDefault());
        entity.setScadenzaMesiAccumuloDefault(input.scadenzaMesiAccumuloDefault());
        entity.setAttivo(true);
        TipoAssenzaEntity saved = tipoAssenzaRepository.save(entity);
        audit(saved, adminId, "CREATO", null);
        return RichiestaAssenzaMapper.toDto(saved);
    }

    @Transactional
    public TipoAssenzaDto update(long tipoAssenzaId, AggiornaTipoAssenzaInput input, long adminId) {
        validateNumericDefaults(input.numeroGiorniAnnuiDefault(), input.numeroGiorniMalattiaAnnuiDefault(), input.scadenzaMesiAccumuloDefault());
        TipoAssenzaEntity entity = requireTipo(tipoAssenzaId);
        String previous = serialize(RichiestaAssenzaMapper.toDto(entity));
        entity.setNome(input.nome().trim());
        entity.setUnitaMisura(input.unitaMisura());
        entity.setRichiedeOrario(input.richiedeOrario());
        entity.setRichiedeDocumentoDefault(input.richiedeDocumentoDefault());
        entity.setScalaDaMonteOreDefault(input.scalaDaMonteOreDefault());
        entity.setPreavvisoMinimoGiorniDefault(input.preavvisoMinimoGiorniDefault());
        entity.setNumeroGiorniAnnuiDefault(input.numeroGiorniAnnuiDefault());
        entity.setNumeroGiorniMalattiaAnnuiDefault(input.numeroGiorniMalattiaAnnuiDefault());
        entity.setScadenzaMesiAccumuloDefault(input.scadenzaMesiAccumuloDefault());
        TipoAssenzaEntity saved = tipoAssenzaRepository.save(entity);
        audit(saved, adminId, "MODIFICATO", previous);
        return RichiestaAssenzaMapper.toDto(saved);
    }

    @Transactional
    public TipoAssenzaDto deactivate(long tipoAssenzaId, long adminId) {
        TipoAssenzaEntity entity = requireTipo(tipoAssenzaId);
        if (!entity.isAttivo()) {
            return RichiestaAssenzaMapper.toDto(entity);
        }
        String previous = serialize(RichiestaAssenzaMapper.toDto(entity));
        entity.setAttivo(false);
        TipoAssenzaEntity saved = tipoAssenzaRepository.save(entity);
        audit(saved, adminId, "DISATTIVATO", previous);
        return RichiestaAssenzaMapper.toDto(saved);
    }

    @Transactional(readOnly = true)
    public List<AuditTipoAssenzaDto> listAudit() {
        return auditRepository.findTop50ByOrderByCreatoIlDesc().stream()
            .map(entry -> new AuditTipoAssenzaDto(
                entry.getId(), entry.getAdminUserIdValue(), entry.getTipoAssenzaId(), entry.getCodice(),
                entry.getAzione(), entry.getValoriPrecedenti(), entry.getValoriNuovi(), entry.getCreatoIl()))
            .toList();
    }

    private TipoAssenzaEntity requireTipo(long id) {
        return tipoAssenzaRepository.findById(id)
            .orElseThrow(() -> new AssenzaNotFoundException("Tipo di assenza non trovato"));
    }

    private void validateNumericDefaults(BigDecimal annual, BigDecimal sickness, Integer expiry) {
        if ((annual != null && annual.signum() < 0)
            || (sickness != null && sickness.signum() < 0)
            || (expiry != null && expiry < 1)) {
            throw new AssenzaValidationException("I valori numerici devono essere positivi");
        }
    }

    private void audit(TipoAssenzaEntity entity, long adminId, String action, String previous) {
        UserEntity admin = userAdminRepository.findById(adminId)
            .orElseThrow(() -> new AssenzaNotFoundException("Utente Admin non trovato"));
        AuditTipoAssenzaDefaultEntity entry = new AuditTipoAssenzaDefaultEntity();
        entry.setAdminUserId(admin.getId());
        entry.setAdminUserIdValue(admin.getUserId());
        entry.setTipoAssenzaId(entity.getId());
        entry.setCodice(entity.getCodice());
        entry.setAzione(action);
        entry.setValoriPrecedenti(previous);
        entry.setValoriNuovi(serialize(RichiestaAssenzaMapper.toDto(entity)));
        auditRepository.save(entry);
    }

    private String serialize(@Nullable TipoAssenzaDto value) {
        if (value == null) {
            throw new AssenzaValidationException("Snapshot di audit non disponibile");
        }
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException exception) {
            throw new AssenzaValidationException("Impossibile registrare la modifica nel journal Admin");
        }
    }
}