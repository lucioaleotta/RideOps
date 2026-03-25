package com.rideops.partners.application;

import com.rideops.partners.adapters.out.PartnerEntity;
import com.rideops.partners.adapters.out.PartnerRepository;
import com.rideops.partners.adapters.out.PartnerServiceCommunicationEntity;
import com.rideops.partners.adapters.out.PartnerServiceCommunicationRepository;
import com.rideops.partners.domain.PartnerType;
import com.rideops.identity.adapters.out.EmailOutboxEntity;
import com.rideops.identity.adapters.out.EmailOutboxRepository;
import com.rideops.services.adapters.out.RideServiceEntity;
import com.rideops.services.adapters.out.RideServiceRepository;
import com.rideops.services.domain.ServiceAssignmentType;
import com.rideops.services.domain.ServiceStatus;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;

@Service
public class PartnerService {

    private final PartnerRepository partnerRepository;
    private final RideServiceRepository rideServiceRepository;
    private final EmailOutboxRepository emailOutboxRepository;
    private final PartnerServiceCommunicationRepository communicationRepository;

    public PartnerService(PartnerRepository partnerRepository,
                          RideServiceRepository rideServiceRepository,
                          EmailOutboxRepository emailOutboxRepository,
                          PartnerServiceCommunicationRepository communicationRepository) {
        this.partnerRepository = partnerRepository;
        this.rideServiceRepository = rideServiceRepository;
        this.emailOutboxRepository = emailOutboxRepository;
        this.communicationRepository = communicationRepository;
    }

    public List<PartnerAssignableServiceDto> listAssignableServices(Long partnerId) {
        PartnerEntity partner = findPartner(partnerId);
        if (partner.isDeleted()) {
            throw new PartnerValidationException("Il partner e` cancellato: non puo` ricevere nuovi affidamenti");
        }

        return rideServiceRepository
            .findAllByServiceAssignmentTypeAndStatusNotOrderByStartAtAsc(ServiceAssignmentType.INTERNAL, ServiceStatus.CLOSED)
            .stream()
            .map(this::toAssignableDto)
            .toList();
    }

    public List<PartnerCollaborationDto> listCollaborations(Long partnerId) {
        PartnerEntity partner = findPartner(partnerId);

        return rideServiceRepository.findAllByPartnerIdOrderByStartAtDesc(partner.getId())
            .stream()
            .map(service -> toCollaborationDto(partner.getId(), service))
            .toList();
    }

    public PartnerEmailCommunicationResultDto sendServiceEmail(Long partnerId, Long serviceId) {
        if (partnerId == null) {
            throw new PartnerValidationException("Partner id obbligatorio");
        }
        if (serviceId == null) {
            throw new PartnerValidationException("Service id obbligatorio");
        }

        PartnerEntity partner = findPartner(partnerId);
        if (partner.isDeleted()) {
            throw new PartnerValidationException("Il partner e` cancellato: comunicazione non consentita");
        }
        if (!partner.isRiceveEmail()) {
            throw new PartnerValidationException("Il partner non e` abilitato a ricevere email");
        }
        if (partner.getEmail() == null || partner.getEmail().isBlank()) {
            throw new PartnerValidationException("Email partner non configurata");
        }

        RideServiceEntity service = rideServiceRepository.findById(serviceId)
            .orElseThrow(() -> new PartnerValidationException("Servizio non trovato: id=" + serviceId));

        if (!partner.getId().equals(service.getPartnerId())) {
            throw new PartnerValidationException("Il servizio non risulta associato al partner selezionato");
        }

        String subject = "RideOps - Dettaglio servizio " + valueOrDash(service.getInternalBookingReference());
        String body = buildPartnerServiceEmailBody(service);

        EmailOutboxEntity outbox = new EmailOutboxEntity();
        outbox.setRecipient(partner.getEmail());
        outbox.setSubject(subject);
        outbox.setBody(body);
        emailOutboxRepository.save(outbox);

        PartnerServiceCommunicationEntity communication = new PartnerServiceCommunicationEntity();
        communication.setPartnerId(partner.getId());
        communication.setServiceId(service.getId());
        communication.setChannel("EMAIL");
        communication.setRecipient(partner.getEmail());
        communication.setSubject(subject);
        communication.setBody(body);
        PartnerServiceCommunicationEntity savedCommunication = communicationRepository.save(communication);

        return new PartnerEmailCommunicationResultDto(
            savedCommunication.getId(),
            partner.getId(),
            service.getId(),
            partner.getEmail(),
            subject,
            savedCommunication.getCreatedAt()
        );
    }

    public List<PartnerDto> search(String ragioneSociale, PartnerType type, boolean includeDeleted) {
        String normalized = cleanNullable(ragioneSociale);
        String lowerFilter = normalized == null ? null : normalized.toLowerCase(Locale.ROOT);

        List<PartnerEntity> base = type == null
            ? partnerRepository.findAllByOrderByRagioneSocialeAsc()
            : partnerRepository.findAllByTypeOrderByRagioneSocialeAsc(type);

        return base.stream()
            .filter(entity -> includeDeleted || !entity.isDeleted())
            .filter(entity -> {
                if (lowerFilter == null) {
                    return true;
                }
                return entity.getRagioneSociale() != null
                    && entity.getRagioneSociale().toLowerCase(Locale.ROOT).contains(lowerFilter);
            })
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
        long numeroServiziAffidati = rideServiceRepository.countByPartnerIdAndServiceAssignmentType(
            entity.getId(),
            ServiceAssignmentType.OUTSOURCED
        );
        long numeroServiziRicevuti = rideServiceRepository.countByPartnerIdAndServiceAssignmentType(
            entity.getId(),
            ServiceAssignmentType.INCOMING
        );
        BigDecimal totaleMarginiOutsourced = rideServiceRepository
            .sumMarginByPartnerIdAndAssignmentType(entity.getId(), ServiceAssignmentType.OUTSOURCED);
        BigDecimal totaleRicaviIncoming = rideServiceRepository
            .sumPriceByPartnerIdAndAssignmentType(entity.getId(), ServiceAssignmentType.INCOMING);
        BigDecimal totaleGuadagni = totaleMarginiOutsourced.add(totaleRicaviIncoming);
        BigDecimal totaleCrediti = rideServiceRepository
            .sumPriceByPartnerIdAndAssignmentType(entity.getId(), ServiceAssignmentType.INCOMING);
        BigDecimal totaleDebiti = rideServiceRepository
            .sumPricePartnerByPartnerIdAndAssignmentType(entity.getId(), ServiceAssignmentType.OUTSOURCED);
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
            numeroServiziAffidati,
            numeroServiziRicevuti,
            totaleMarginiOutsourced,
            totaleRicaviIncoming,
            totaleGuadagni,
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

    private PartnerAssignableServiceDto toAssignableDto(RideServiceEntity service) {
        return new PartnerAssignableServiceDto(
            service.getId(),
            service.getInternalBookingReference(),
            service.getStartAt(),
            service.getPickupLocation(),
            service.getDestination(),
            service.getType(),
            service.getClientName(),
            service.getClientPhone(),
            service.getClientEmail(),
            service.getPassengersCount(),
            service.getItinerary(),
            service.getPrice()
        );
    }

    private PartnerCollaborationDto toCollaborationDto(Long partnerId, RideServiceEntity service) {
        long emailCount = communicationRepository.countByPartnerIdAndServiceIdAndChannel(partnerId, service.getId(), "EMAIL");
        LocalDateTime lastEmailAt = communicationRepository.findLastCommunicationAt(partnerId, service.getId(), "EMAIL");

        return new PartnerCollaborationDto(
            service.getId(),
            service.getInternalBookingReference(),
            service.getStartAt(),
            service.getPickupLocation(),
            service.getDestination(),
            service.getType(),
            service.getStatus(),
            service.getServiceAssignmentType(),
            service.getClientName(),
            service.getClientPhone(),
            service.getClientEmail(),
            service.getPassengersCount(),
            service.getItinerary(),
            service.getPricePartner(),
            emailCount,
            lastEmailAt
        );
    }

    private String buildPartnerServiceEmailBody(RideServiceEntity service) {
        return String.join("\n",
            "Gentile partner,",
            "",
            "di seguito i dettagli del servizio:",
            "- ID (Rif.int): " + valueOrDash(service.getInternalBookingReference()),
            "- Data e ora: " + valueOrDash(service.getStartAt() == null ? null : service.getStartAt().toString()),
            "- Pickup: " + valueOrDash(service.getPickupLocation()),
            "- Destinazione: " + valueOrDash(service.getDestination()),
            "- Tipologia: " + valueOrDash(service.getType() == null ? null : service.getType().name()),
            "- Cliente: " + valueOrDash(service.getClientName()),
            "- Tel. Cliente: " + valueOrDash(service.getClientPhone()),
            "- Email Cliente: " + valueOrDash(service.getClientEmail()),
            "- Numero Passeggeri: " + valueOrDash(service.getPassengersCount() == null ? null : service.getPassengersCount().toString()),
            "- Itinerario: " + valueOrDash(service.getItinerary()),
            "- pricePartner: " + valueOrDash(service.getPricePartner() == null ? null : service.getPricePartner().toPlainString()),
            "",
            "RideOps"
        );
    }

    private String valueOrDash(String value) {
        if (value == null || value.isBlank()) {
            return "-";
        }
        return value;
    }
}
