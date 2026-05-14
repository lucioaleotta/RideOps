package com.rideops.partners.application;

import com.rideops.identity.application.BrevoEmailClient;
import com.rideops.identity.application.BrevoTemplates;
import com.rideops.partners.adapters.out.PartnerEntity;
import com.rideops.partners.adapters.out.PartnerRepository;
import com.rideops.partners.adapters.out.PartnerServiceCommunicationEntity;
import com.rideops.partners.adapters.out.PartnerServiceCommunicationRepository;
import com.rideops.partners.domain.PartnerType;
import com.rideops.identity.adapters.out.EmailOutboxEntity;
import com.rideops.identity.adapters.out.EmailOutboxRepository;
import com.rideops.multitenancy.application.TenantManagementRepositoryPort;
import com.rideops.services.adapters.out.RideServiceEntity;
import com.rideops.services.adapters.out.RideServiceRepository;
import com.rideops.services.domain.ServiceAssignmentType;
import com.rideops.services.domain.ServiceStatus;
import com.rideops.multitenancy.TenantContext;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class PartnerService {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    private final PartnerRepository partnerRepository;
    private final RideServiceRepository rideServiceRepository;
    private final EmailOutboxRepository emailOutboxRepository;
    private final PartnerServiceCommunicationRepository communicationRepository;
    private final TenantContext tenantContext;
    private final TenantManagementRepositoryPort tenantManagementRepositoryPort;
    private final BrevoEmailClient brevoEmailClient;

    public PartnerService(PartnerRepository partnerRepository,
                          RideServiceRepository rideServiceRepository,
                          EmailOutboxRepository emailOutboxRepository,
                          PartnerServiceCommunicationRepository communicationRepository,
                          TenantContext tenantContext,
                          TenantManagementRepositoryPort tenantManagementRepositoryPort,
                          BrevoEmailClient brevoEmailClient) {
        this.partnerRepository = partnerRepository;
        this.rideServiceRepository = rideServiceRepository;
        this.emailOutboxRepository = emailOutboxRepository;
        this.communicationRepository = communicationRepository;
        this.tenantContext = tenantContext;
        this.tenantManagementRepositoryPort = tenantManagementRepositoryPort;
        this.brevoEmailClient = brevoEmailClient;
    }

    public List<PartnerAssignableServiceDto> listAssignableServices(Long partnerId) {
        PartnerEntity partner = findPartner(partnerId);
        if (partner.isDeleted()) {
            throw new PartnerValidationException("Il partner e` cancellato: non puo` ricevere nuovi affidamenti");
        }

        return rideServiceRepository
            .findAllByServiceAssignmentTypeAndStatusNotAndTenantIdOrderByStartAtAsc(
                ServiceAssignmentType.INTERNAL,
                ServiceStatus.CLOSED,
                tenantContext.requireTenantId()
            )
            .stream()
            .map(this::toAssignableDto)
            .toList();
    }

    public List<PartnerCollaborationDto> listCollaborations(Long partnerId) {
        PartnerEntity partner = findPartner(partnerId);

        return rideServiceRepository.findAllByPartnerIdAndTenantIdOrderByStartAtDesc(partner.getId(), tenantContext.requireTenantId())
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

        RideServiceEntity service = rideServiceRepository.findByIdAndTenantId(serviceId, tenantContext.requireTenantId())
            .orElseThrow(() -> new PartnerValidationException("Servizio non trovato: id=" + serviceId));

        if (!partner.getId().equals(service.getPartnerId())) {
            throw new PartnerValidationException("Il servizio non risulta associato al partner selezionato");
        }

        String subject = "RideOps - Dettaglio servizio " + valueOrDash(service.getInternalBookingReference());
        String body = buildPartnerServiceEmailBody(service);
        Long tenantId = tenantContext.requireTenantId();

        brevoEmailClient.sendTemplateEmail(
            tenantId,
            partner.getEmail(),
            partner.getRagioneSociale(),
            BrevoTemplates.TRASFERIMENTO_NCC,
            buildBrevoTransferParams(tenantId, partner, service)
        );

        EmailOutboxEntity outbox = new EmailOutboxEntity();
        outbox.setTenantId(tenantId);
        outbox.setRecipient(partner.getEmail());
        outbox.setSubject(subject);
        outbox.setBody(body);
        emailOutboxRepository.save(outbox);

        PartnerServiceCommunicationEntity communication = new PartnerServiceCommunicationEntity();
        communication.setTenantId(tenantId);
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
            ? partnerRepository.findAllByTenantIdOrderByRagioneSocialeAsc(tenantContext.requireTenantId())
            : partnerRepository.findAllByTypeAndTenantIdOrderByRagioneSocialeAsc(type, tenantContext.requireTenantId());

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

        Long tenantId = tenantContext.requireTenantId();
        if (partnerRepository.existsByRagioneSocialeIgnoreCaseAndDeletedFalseAndTenantId(ragioneSociale.trim(), tenantId)) {
            throw new PartnerValidationException("Esiste gia` un partner attivo con la stessa ragione sociale");
        }

        PartnerEntity entity = new PartnerEntity();
        entity.setTenantId(tenantId);
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

        if (partnerRepository.existsByRagioneSocialeIgnoreCaseAndDeletedFalseAndIdNotAndTenantId(
            ragioneSociale.trim(),
            partnerId,
            tenantContext.requireTenantId()
        )) {
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
        return partnerRepository.findByIdAndTenantId(partnerId, tenantContext.requireTenantId())
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
        Long tenantId = tenantContext.requireTenantId();
        long numeroServiziAffidati = rideServiceRepository.countByPartnerIdAndServiceAssignmentTypeAndTenantId(
            entity.getId(),
            ServiceAssignmentType.OUTSOURCED,
            tenantId
        );
        long numeroServiziRicevuti = rideServiceRepository.countByPartnerIdAndServiceAssignmentTypeAndTenantId(
            entity.getId(),
            ServiceAssignmentType.INCOMING,
            tenantId
        );
        BigDecimal totaleMarginiOutsourced = rideServiceRepository
            .sumMarginByPartnerIdAndAssignmentType(entity.getId(), ServiceAssignmentType.OUTSOURCED, tenantId);
        BigDecimal totaleRicaviIncoming = rideServiceRepository
            .sumPriceByPartnerIdAndAssignmentType(entity.getId(), ServiceAssignmentType.INCOMING, tenantId);
        BigDecimal totaleGuadagni = totaleMarginiOutsourced.add(totaleRicaviIncoming);
        BigDecimal totaleCrediti = rideServiceRepository
            .sumPriceByPartnerIdAndAssignmentType(entity.getId(), ServiceAssignmentType.INCOMING, tenantId);
        BigDecimal totaleDebiti = rideServiceRepository
            .sumPricePartnerByPartnerIdAndAssignmentType(entity.getId(), ServiceAssignmentType.OUTSOURCED, tenantId);
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
        Long tenantId = tenantContext.requireTenantId();
        long emailCount = communicationRepository.countByPartnerIdAndServiceIdAndChannelAndTenantId(
            partnerId,
            service.getId(),
            "EMAIL",
            tenantId
        );
        LocalDateTime lastEmailAt = communicationRepository.findLastCommunicationAt(partnerId, service.getId(), "EMAIL", tenantId);

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

    private Map<String, Object> buildBrevoTransferParams(Long tenantId,
                                                          PartnerEntity partner,
                                                          RideServiceEntity service) {
        String senderCompanyName = tenantManagementRepositoryPort.findById(tenantId)
            .map(tenant -> valueOrEmpty(tenant.getBusinessName()))
            .orElse("RideOps");

        String[] customerNames = splitFullName(service.getClientName());
        LocalDateTime startAt = service.getStartAt();
        String pickupDate = startAt == null ? "" : DATE_FORMATTER.format(startAt.toLocalDate());
        String pickupTime = startAt == null ? "" : TIME_FORMATTER.format(startAt.toLocalTime());

        Map<String, Object> params = new LinkedHashMap<>();
        params.put("partnerName", valueOrEmpty(partner.getRagioneSociale()));
        params.put("senderCompanyName", senderCompanyName);
        params.put("pickupDate", pickupDate);
        params.put("pickupTime", pickupTime);
        params.put("pickupAddress", valueOrEmpty(service.getPickupLocation()));
        params.put("dropoffAddress", valueOrEmpty(service.getDestination()));
        params.put("passengers", service.getPassengersCount() == null ? "" : service.getPassengersCount().toString());
        params.put("clientFirstName", customerNames[0]);
        params.put("clientLastName", customerNames[1]);
        params.put("clientCompany", valueOrEmpty(service.getClientName()));
        params.put("clientPhone", valueOrEmpty(service.getClientPhone()));
        params.put("notes", valueOrEmpty(service.getNotes()));
        return params;
    }

    private String valueOrEmpty(String value) {
        return value == null ? "" : value;
    }

    private String[] splitFullName(String fullName) {
        if (fullName == null || fullName.isBlank()) {
            return new String[] {"", ""};
        }
        String normalized = fullName.trim();
        int separator = normalized.indexOf(' ');
        if (separator < 0) {
            return new String[] {normalized, ""};
        }
        return new String[] {
            normalized.substring(0, separator).trim(),
            normalized.substring(separator + 1).trim()
        };
    }
}
