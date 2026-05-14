package com.rideops.services.application;

import com.rideops.identity.application.BrevoEmailClient;
import com.rideops.identity.application.BrevoTemplates;
import com.rideops.identity.adapters.out.EmailOutboxEntity;
import com.rideops.identity.adapters.out.EmailOutboxRepository;
import com.rideops.multitenancy.application.TenantManagementRepositoryPort;
import com.rideops.partners.adapters.out.PartnerEntity;
import com.rideops.partners.adapters.out.PartnerRepository;
import com.rideops.partners.adapters.out.PartnerServiceCommunicationEntity;
import com.rideops.partners.adapters.out.PartnerServiceCommunicationRepository;
import com.rideops.services.adapters.out.RideServiceEntity;
import com.rideops.multitenancy.TenantContext;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class ServicePartnerOperationsUseCase {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    private final ServiceRepositoryPort serviceRepositoryPort;
    private final PartnerRepository partnerRepository;
    private final EmailOutboxRepository emailOutboxRepository;
    private final PartnerServiceCommunicationRepository communicationRepository;
    private final TenantContext tenantContext;
    private final TenantManagementRepositoryPort tenantManagementRepositoryPort;
    private final BrevoEmailClient brevoEmailClient;

    public ServicePartnerOperationsUseCase(ServiceRepositoryPort serviceRepositoryPort,
                                           PartnerRepository partnerRepository,
                                           EmailOutboxRepository emailOutboxRepository,
                                           PartnerServiceCommunicationRepository communicationRepository,
                                           TenantContext tenantContext,
                                           TenantManagementRepositoryPort tenantManagementRepositoryPort,
                                           BrevoEmailClient brevoEmailClient) {
        this.serviceRepositoryPort = serviceRepositoryPort;
        this.partnerRepository = partnerRepository;
        this.emailOutboxRepository = emailOutboxRepository;
        this.communicationRepository = communicationRepository;
        this.tenantContext = tenantContext;
        this.tenantManagementRepositoryPort = tenantManagementRepositoryPort;
        this.brevoEmailClient = brevoEmailClient;
    }

    public ServicePartnerHistoryDto getPartnerHistory(Long serviceId) {
        RideServiceEntity service = findService(serviceId);
        PartnerEntity partner = findPartnerLinkedToService(service);
        Long tenantId = tenantContext.requireTenantId();

        Long outgoingPartnerId = null;
        String outgoingPartnerRagioneSociale = null;
        String outgoingPartnerEmail = null;

        if (service.getServiceAssignmentType() == com.rideops.services.domain.ServiceAssignmentType.INCOMING_OUTSOURCED
                && service.getOutgoingPartnerId() != null) {
            java.util.Optional<PartnerEntity> outgoingPartnerOpt = partnerRepository
                .findByIdAndTenantId(service.getOutgoingPartnerId(), tenantId);
            if (outgoingPartnerOpt.isPresent()) {
                PartnerEntity outgoingPartner = outgoingPartnerOpt.get();
                outgoingPartnerId = outgoingPartner.getId();
                outgoingPartnerRagioneSociale = outgoingPartner.getRagioneSociale();
                outgoingPartnerEmail = outgoingPartner.getEmail();
            }
        }

        List<ServicePartnerCommunicationDto> communications = communicationRepository
            .findAllByServiceIdAndTenantIdOrderByCreatedAtDesc(service.getId(), tenantId)
            .stream()
            .map(item -> new ServicePartnerCommunicationDto(
                item.getId(),
                item.getChannel(),
                item.getRecipient(),
                item.getSubject(),
                item.getCreatedAt()
            ))
            .toList();

        return new ServicePartnerHistoryDto(
            service.getId(),
            service.getServiceAssignmentType(),
            partner.getId(),
            partner.getRagioneSociale(),
            partner.getEmail(),
            service.getPricePartner(),
            service.getMargin(),
            outgoingPartnerId,
            outgoingPartnerRagioneSociale,
            outgoingPartnerEmail,
            communications
        );
    }

    public ServicePartnerCommunicationResultDto sendEmail(Long serviceId) {
        RideServiceEntity service = findService(serviceId);
        PartnerEntity partner = findPartnerLinkedToService(service);

        if (!partner.isRiceveEmail()) {
            throw new ServiceValidationException("Il partner non e` abilitato a ricevere email");
        }
        if (partner.getEmail() == null || partner.getEmail().isBlank()) {
            throw new ServiceValidationException("Email partner non configurata");
        }

        String subject = "RideOps - Dettaglio servizio " + valueOrDash(service.getInternalBookingReference());
        String body = buildEmailBody(service);
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

        return new ServicePartnerCommunicationResultDto(
            savedCommunication.getId(),
            service.getId(),
            partner.getId(),
            partner.getEmail(),
            subject,
            savedCommunication.getCreatedAt()
        );
    }

    private RideServiceEntity findService(Long serviceId) {
        if (serviceId == null) {
            throw new ServiceValidationException("Service id obbligatorio");
        }
        return serviceRepositoryPort.findById(serviceId)
            .orElseThrow(() -> new ServiceNotFoundException(serviceId));
    }

    private PartnerEntity findPartnerLinkedToService(RideServiceEntity service) {
        // Per INCOMING_OUTSOURCED l'email viene inviata al partner esecutore (outgoingPartnerId)
        Long partnerId = service.getServiceAssignmentType() == com.rideops.services.domain.ServiceAssignmentType.INCOMING_OUTSOURCED
            ? service.getOutgoingPartnerId()
            : service.getPartnerId();
        if (partnerId == null) {
            throw new ServiceValidationException("Il servizio selezionato non e` associato a un partner");
        }
        return partnerRepository.findByIdAndTenantId(partnerId, tenantContext.requireTenantId())
            .filter(partner -> !partner.isDeleted())
            .orElseThrow(() -> new ServiceValidationException("Partner non valido o non attivo"));
    }

    private String buildEmailBody(RideServiceEntity service) {
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
