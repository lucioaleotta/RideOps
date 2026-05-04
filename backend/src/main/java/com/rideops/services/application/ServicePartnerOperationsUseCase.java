package com.rideops.services.application;

import com.rideops.identity.adapters.out.EmailOutboxEntity;
import com.rideops.identity.adapters.out.EmailOutboxRepository;
import com.rideops.partners.adapters.out.PartnerEntity;
import com.rideops.partners.adapters.out.PartnerRepository;
import com.rideops.partners.adapters.out.PartnerServiceCommunicationEntity;
import com.rideops.partners.adapters.out.PartnerServiceCommunicationRepository;
import com.rideops.services.adapters.out.RideServiceEntity;
import com.rideops.multitenancy.TenantContext;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ServicePartnerOperationsUseCase {

    private final ServiceRepositoryPort serviceRepositoryPort;
    private final PartnerRepository partnerRepository;
    private final EmailOutboxRepository emailOutboxRepository;
    private final PartnerServiceCommunicationRepository communicationRepository;
    private final TenantContext tenantContext;

    public ServicePartnerOperationsUseCase(ServiceRepositoryPort serviceRepositoryPort,
                                           PartnerRepository partnerRepository,
                                           EmailOutboxRepository emailOutboxRepository,
                                           PartnerServiceCommunicationRepository communicationRepository,
                                           TenantContext tenantContext) {
        this.serviceRepositoryPort = serviceRepositoryPort;
        this.partnerRepository = partnerRepository;
        this.emailOutboxRepository = emailOutboxRepository;
        this.communicationRepository = communicationRepository;
        this.tenantContext = tenantContext;
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
}
