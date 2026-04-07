package com.rideops.services.application;

import com.rideops.services.adapters.out.RideServiceEntity;
import com.rideops.partners.adapters.out.PartnerRepository;
import com.rideops.services.domain.ServiceAssignmentType;
import com.rideops.services.domain.ServiceStatus;
import com.rideops.multitenancy.TenantContext;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;

@Service
public class UpdateServiceUseCase {

    private final ServiceRepositoryPort serviceRepositoryPort;
    private final VehicleAssignmentValidationService vehicleAssignmentValidationService;
    private final PartnerRepository partnerRepository;
    private final TenantContext tenantContext;

    public UpdateServiceUseCase(ServiceRepositoryPort serviceRepositoryPort,
                                VehicleAssignmentValidationService vehicleAssignmentValidationService,
                                PartnerRepository partnerRepository,
                                TenantContext tenantContext) {
        this.serviceRepositoryPort = serviceRepositoryPort;
        this.vehicleAssignmentValidationService = vehicleAssignmentValidationService;
        this.partnerRepository = partnerRepository;
        this.tenantContext = tenantContext;
    }

    public ServiceDto execute(@NonNull Long serviceId, UpdateServiceCommand command) {
        RideServiceEntity entity = serviceRepositoryPort.findById(serviceId)
            .orElseThrow(() -> new ServiceNotFoundException(serviceId));

        if (entity.getStatus() == ServiceStatus.CLOSED || entity.getStatus() == ServiceStatus.EXECUTED) {
            throw new ServiceValidationException("Un servizio ESEGUITO/CLOSED non puo` essere aggiornato");
        }

        if (command.startAt() == null) {
            throw new ServiceValidationException("La data/ora di inizio e` obbligatoria");
        }

        ServiceValidationSupport.validateBusinessFields(
            command.type(),
            command.durationHours(),
            command.pickupLocation(),
            command.destination()
        );
        ServiceValidationSupport.validatePassengersCount(command.passengersCount());
        vehicleAssignmentValidationService.validateForUpdate(serviceId, command);

        ServiceValidationSupport.validateRequestedTransition(entity.getStatus(), command.status());

        ServiceAssignmentType targetAssignmentType = command.serviceAssignmentType() == null
            ? entity.getServiceAssignmentType()
            : command.serviceAssignmentType();
        ServiceValidationSupport.validateAssignmentTransition(entity.getServiceAssignmentType(), targetAssignmentType);
        ServiceValidationSupport.validateAssignmentBusinessRules(
            targetAssignmentType,
            command.partnerId(),
            command.pricePartner()
        );
        validatePartnerIfPresent(command.partnerId());

        entity.setStartAt(command.startAt());
        entity.setPickupLocation(command.pickupLocation().trim());
        entity.setDestination(command.destination().trim());
        entity.setType(command.type());
        entity.setDurationHours(command.durationHours());
        entity.setNotes(cleanNullable(command.notes()));
        entity.setPrice(command.price());
        entity.setExternalBookingReference(command.externalBookingReference());
        entity.setClientName(cleanNullable(command.clientName()));
        entity.setClientPhone(cleanNullable(command.clientPhone()));
        entity.setClientEmail(cleanNullable(command.clientEmail()));
        entity.setPassengersCount(command.passengersCount());
        entity.setItinerary(cleanNullable(command.itinerary()));
        entity.setServiceAssignmentType(targetAssignmentType);
        entity.setPartnerId(command.partnerId());
        entity.setPricePartner(command.pricePartner());
        entity.setMargin(ServiceValidationSupport.calculateMargin(command.price(), command.pricePartner()));
        entity.setAssignedVehicleId(command.assignedVehicleId());
        if (command.status() != null) {
            entity.setStatus(command.status());
        }

        return ServiceMapper.toDto(serviceRepositoryPort.save(entity));
    }

    private String cleanNullable(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private void validatePartnerIfPresent(Long partnerId) {
        if (partnerId == null) {
            return;
        }

        boolean partnerValid = partnerRepository.findByIdAndTenantId(partnerId, tenantContext.requireTenantId())
            .map(partner -> !partner.isDeleted())
            .orElse(false);
        if (!partnerValid) {
            throw new ServiceValidationException("Partner non valido o non attivo");
        }
    }
}