package com.rideops.services.application;

import com.rideops.partners.adapters.out.PartnerRepository;
import com.rideops.services.adapters.out.RideServiceEntity;
import com.rideops.services.domain.ServiceAssignmentType;
import com.rideops.services.domain.ServiceStatus;
import java.math.BigDecimal;
import org.springframework.stereotype.Service;

@Service
public class OutsourceServiceUseCase {

    private final ServiceRepositoryPort serviceRepositoryPort;
    private final PartnerRepository partnerRepository;

    public OutsourceServiceUseCase(ServiceRepositoryPort serviceRepositoryPort,
                                   PartnerRepository partnerRepository) {
        this.serviceRepositoryPort = serviceRepositoryPort;
        this.partnerRepository = partnerRepository;
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

        if (entity.getStatus() == ServiceStatus.CLOSED) {
            throw new ServiceValidationException("Un servizio chiuso non puo` essere affidato a partner");
        }

        if (entity.getServiceAssignmentType() == ServiceAssignmentType.INCOMING) {
            throw new ServiceValidationException("Un servizio INCOMING non puo` essere affidato a partner");
        }

        if (pricePartner.signum() < 0) {
            throw new ServiceValidationException("Il prezzo partner non puo` essere negativo");
        }

        boolean partnerValid = partnerRepository.findById(partnerId)
            .map(partner -> !partner.isDeleted())
            .orElse(false);
        if (!partnerValid) {
            throw new ServiceValidationException("Partner non valido o non attivo");
        }

        entity.setServiceAssignmentType(ServiceAssignmentType.OUTSOURCED);
        entity.setPartnerId(partnerId);
        entity.setPricePartner(pricePartner);
        entity.setMargin(ServiceValidationSupport.calculateMargin(entity.getPrice(), pricePartner));

        return ServiceMapper.toDto(serviceRepositoryPort.save(entity));
    }
}
