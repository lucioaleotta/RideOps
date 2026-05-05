package com.rideops.services.application;

import com.rideops.partners.adapters.out.PartnerRepository;
import com.rideops.services.adapters.out.RideServiceEntity;
import com.rideops.services.domain.ServiceAssignmentType;
import com.rideops.services.domain.ServiceStatus;
import com.rideops.multitenancy.TenantContext;
import java.math.BigDecimal;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class OutsourceServiceUseCase {

    private static final Logger log = LoggerFactory.getLogger(OutsourceServiceUseCase.class);

    private final ServiceRepositoryPort serviceRepositoryPort;
    private final PartnerRepository partnerRepository;
    private final TenantContext tenantContext;

    public OutsourceServiceUseCase(ServiceRepositoryPort serviceRepositoryPort,
                                   PartnerRepository partnerRepository,
                                   TenantContext tenantContext) {
        this.serviceRepositoryPort = serviceRepositoryPort;
        this.partnerRepository = partnerRepository;
        this.tenantContext = tenantContext;
    }

    public ServiceDto execute(Long serviceId, Long partnerId, BigDecimal pricePartner) {
        if (serviceId == null) {
            throw new ServiceValidationException("Service id obbligatorio");
        }
        if (partnerId == null) {
            throw new ServiceValidationException("Partner id obbligatorio");
        }
        if (pricePartner == null) {
            throw new ServiceValidationException("Prezzo partner obbligatorio");
        }

        RideServiceEntity entity = serviceRepositoryPort.findById(serviceId)
            .orElseThrow(() -> new ServiceNotFoundException(serviceId));

        if (entity.getStatus() == ServiceStatus.CLOSED || entity.getStatus() == ServiceStatus.EXECUTED) {
            throw new ServiceValidationException("Un servizio ESEGUITO/CLOSED non puo` essere affidato a partner");
        }

        if (pricePartner.signum() < 0) {
            throw new ServiceValidationException("Il prezzo partner non puo` essere negativo");
        }

        boolean partnerValid = partnerRepository.findByIdAndTenantId(partnerId, tenantContext.requireTenantId())
            .map(partner -> !partner.isDeleted())
            .orElse(false);
        if (!partnerValid) {
            throw new ServiceValidationException("Partner non valido o non attivo");
        }

        if (entity.getServiceAssignmentType() == ServiceAssignmentType.INCOMING) {
            // Servizio ricevuto da Agenzia A (entity.partnerId rimane invariato) e
            // ora affidato in esecuzione a NCC B (outgoingPartnerId).
            entity.setServiceAssignmentType(ServiceAssignmentType.INCOMING_OUTSOURCED);
            entity.setOutgoingPartnerId(partnerId);
        } else {
            entity.setServiceAssignmentType(ServiceAssignmentType.OUTSOURCED);
            entity.setPartnerId(partnerId);
            entity.setOutgoingPartnerId(null);
        }
        entity.setPricePartner(pricePartner);
        entity.setMargin(ServiceValidationSupport.calculateMargin(entity.getPrice(), pricePartner));
        entity.setAssignedDriverId(null);
        entity.setAssignedByUserId(null);
        entity.setAssignedAt(null);
        entity.setAssignedVehicleId(null);
        if (entity.getStatus() == ServiceStatus.ASSIGNED) {
            entity.setStatus(ServiceStatus.OPEN);
        }

        ServiceDto result = ServiceMapper.toDto(serviceRepositoryPort.save(entity));
        log.info("action=service.outsource serviceId={} partnerId={} assignmentType={} outcome=success",
            serviceId, partnerId, entity.getServiceAssignmentType());
        return result;
    }
}
