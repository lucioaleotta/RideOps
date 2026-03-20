package com.rideops.partners.application;

import com.rideops.partners.adapters.out.PartnerEntity;
import com.rideops.partners.adapters.out.PartnerRepository;
import com.rideops.partners.domain.PartnerType;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class PartnerService {

    private final PartnerRepository partnerRepository;

    public PartnerService(PartnerRepository partnerRepository) {
        this.partnerRepository = partnerRepository;
    }

    public List<PartnerDto> search(String ragioneSociale, PartnerType type, boolean includeDeleted) {
        return partnerRepository.search(cleanNullable(ragioneSociale), type, includeDeleted)
            .stream()
            .map(this::toDto)
            .toList();
    }

    public PartnerDto getById(Long partnerId) {
        return toDto(findPartner(partnerId));
    }

    public PartnerDto create(PartnerType type,
                             String ragioneSociale,
                             String nomeReferente,
                             String cognomeReferente,
                             String telefono,
                             String email,
                             String citta,
                             String indirizzo,
                             String zonaOperativa,
                             String partitaIva,
                             String codiceFiscale,
                             String iban,
                             String intestatarioConto,
                             String notePagamenti,
                             boolean riceveEmail,
                             boolean riceveWhatsApp,
                             String telefonoWhatsApp,
                             String noteOperative) {
        validateInput(type, ragioneSociale);

        if (partnerRepository.existsByRagioneSocialeIgnoreCaseAndDeletedFalse(ragioneSociale.trim())) {
            throw new PartnerValidationException("Esiste gia` un partner attivo con la stessa ragione sociale");
        }

        PartnerEntity entity = new PartnerEntity();
        entity.setType(type);
        entity.setRagioneSociale(ragioneSociale.trim());
        entity.setNomeReferente(cleanNullable(nomeReferente));
        entity.setCognomeReferente(cleanNullable(cognomeReferente));
        entity.setTelefono(cleanNullable(telefono));
        entity.setEmail(cleanNullable(email));
        entity.setCitta(cleanNullable(citta));
        entity.setIndirizzo(cleanNullable(indirizzo));
        entity.setZonaOperativa(cleanNullable(zonaOperativa));
        entity.setPartitaIva(cleanNullable(partitaIva));
        entity.setCodiceFiscale(cleanNullable(codiceFiscale));
        entity.setIban(cleanNullable(iban));
        entity.setIntestatarioConto(cleanNullable(intestatarioConto));
        entity.setNotePagamenti(cleanNullable(notePagamenti));
        entity.setRiceveEmail(riceveEmail);
        entity.setRiceveWhatsApp(riceveWhatsApp);
        entity.setTelefonoWhatsApp(cleanNullable(telefonoWhatsApp));
        entity.setNoteOperative(cleanNullable(noteOperative));
        entity.setDeleted(false);
        entity.setDeletedAt(null);

        return toDto(partnerRepository.save(entity));
    }

    public PartnerDto update(Long partnerId,
                             PartnerType type,
                             String ragioneSociale,
                             String nomeReferente,
                             String cognomeReferente,
                             String telefono,
                             String email,
                             String citta,
                             String indirizzo,
                             String zonaOperativa,
                             String partitaIva,
                             String codiceFiscale,
                             String iban,
                             String intestatarioConto,
                             String notePagamenti,
                             boolean riceveEmail,
                             boolean riceveWhatsApp,
                             String telefonoWhatsApp,
                             String noteOperative) {
        validateInput(type, ragioneSociale);

        PartnerEntity entity = findPartner(partnerId);
        if (entity.isDeleted()) {
            throw new PartnerValidationException("Il partner e` cancellato: non puo` essere modificato");
        }

        if (partnerRepository.existsByRagioneSocialeIgnoreCaseAndDeletedFalseAndIdNot(ragioneSociale.trim(), partnerId)) {
            throw new PartnerValidationException("Esiste gia` un partner attivo con la stessa ragione sociale");
        }

        entity.setType(type);
        entity.setRagioneSociale(ragioneSociale.trim());
        entity.setNomeReferente(cleanNullable(nomeReferente));
        entity.setCognomeReferente(cleanNullable(cognomeReferente));
        entity.setTelefono(cleanNullable(telefono));
        entity.setEmail(cleanNullable(email));
        entity.setCitta(cleanNullable(citta));
        entity.setIndirizzo(cleanNullable(indirizzo));
        entity.setZonaOperativa(cleanNullable(zonaOperativa));
        entity.setPartitaIva(cleanNullable(partitaIva));
        entity.setCodiceFiscale(cleanNullable(codiceFiscale));
        entity.setIban(cleanNullable(iban));
        entity.setIntestatarioConto(cleanNullable(intestatarioConto));
        entity.setNotePagamenti(cleanNullable(notePagamenti));
        entity.setRiceveEmail(riceveEmail);
        entity.setRiceveWhatsApp(riceveWhatsApp);
        entity.setTelefonoWhatsApp(cleanNullable(telefonoWhatsApp));
        entity.setNoteOperative(cleanNullable(noteOperative));

        return toDto(partnerRepository.save(entity));
    }

    public PartnerDto deactivate(Long partnerId) {
        PartnerEntity entity = findPartner(partnerId);
        if (!entity.isDeleted()) {
            entity.setDeleted(true);
            entity.setDeletedAt(LocalDateTime.now());
        }
        return toDto(partnerRepository.save(entity));
    }

    private void validateInput(PartnerType type, String ragioneSociale) {
        if (type == null) {
            throw new PartnerValidationException("Tipologia partner obbligatoria");
        }
        if (ragioneSociale == null || ragioneSociale.trim().isEmpty()) {
            throw new PartnerValidationException("Ragione sociale obbligatoria");
        }
    }

    private PartnerEntity findPartner(Long partnerId) {
        if (partnerId == null) {
            throw new PartnerValidationException("Partner id obbligatorio");
        }
        return partnerRepository.findById(partnerId)
            .orElseThrow(() -> new PartnerNotFoundException(partnerId));
    }

    private String cleanNullable(String value) {
        if (value == null) {
            return null;
        }
        String cleaned = value.trim();
        return cleaned.isEmpty() ? null : cleaned;
    }

    private PartnerDto toDto(PartnerEntity entity) {
        BigDecimal totaleCrediti = BigDecimal.ZERO;
        BigDecimal totaleDebiti = BigDecimal.ZERO;
        BigDecimal saldoAttuale = totaleCrediti.subtract(totaleDebiti);

        return new PartnerDto(
            entity.getId(),
            entity.getType(),
            entity.getRagioneSociale(),
            entity.getNomeReferente(),
            entity.getCognomeReferente(),
            entity.getTelefono(),
            entity.getEmail(),
            entity.getCitta(),
            entity.getIndirizzo(),
            entity.getZonaOperativa(),
            entity.getPartitaIva(),
            entity.getCodiceFiscale(),
            entity.getIban(),
            entity.getIntestatarioConto(),
            entity.getNotePagamenti(),
            saldoAttuale,
            totaleCrediti,
            totaleDebiti,
            entity.isRiceveEmail(),
            entity.isRiceveWhatsApp(),
            entity.getTelefonoWhatsApp(),
            entity.getNoteOperative(),
            entity.isDeleted(),
            entity.getDeletedAt(),
            entity.getCreatedAt(),
            entity.getUpdatedAt()
        );
    }
}
