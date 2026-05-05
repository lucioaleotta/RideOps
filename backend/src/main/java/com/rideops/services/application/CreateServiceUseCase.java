package com.rideops.services.application;

import com.rideops.services.adapters.out.RideServiceEntity;
import com.rideops.partners.adapters.out.PartnerRepository;
import com.rideops.services.domain.ServiceAssignmentType;
import com.rideops.services.domain.ServiceStatus;
import com.rideops.multitenancy.TenantContext;
import java.time.LocalDate;
import java.time.LocalDateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class CreateServiceUseCase {

    private static final Logger log = LoggerFactory.getLogger(CreateServiceUseCase.class);

    private final ServiceRepositoryPort serviceRepositoryPort;
    private final VehicleAssignmentValidationService vehicleAssignmentValidationService;
    private final PartnerRepository partnerRepository;
    private final TenantContext tenantContext;

    public CreateServiceUseCase(ServiceRepositoryPort serviceRepositoryPort,
                                VehicleAssignmentValidationService vehicleAssignmentValidationService,
                                PartnerRepository partnerRepository,
                                TenantContext tenantContext) {
        this.serviceRepositoryPort = serviceRepositoryPort;
        this.vehicleAssignmentValidationService = vehicleAssignmentValidationService;
        this.partnerRepository = partnerRepository;
        this.tenantContext = tenantContext;
    }

    public ServiceDto execute(CreateServiceCommand command) {
        validateStartAt(command.startAt());
        ServiceValidationSupport.validateBusinessFields(
            command.type(),
            command.durationHours(),
            command.pickupLocation(),
            command.destination()
        );
        ServiceValidationSupport.validatePassengersCount(command.passengersCount());
        vehicleAssignmentValidationService.validateForCreate(command);

        ServiceStatus initialStatus = ServiceValidationSupport.sanitizeCreateStatus(command.status());
        ServiceAssignmentType assignmentType = ServiceValidationSupport
            .sanitizeCreateAssignmentType(command.serviceAssignmentType());
        ServiceValidationSupport.validateAssignmentBusinessRules(
            assignmentType,
            command.partnerId(),
            command.pricePartner()
        );
        validatePartnerIfPresent(command.partnerId());

        RideServiceEntity entity = new RideServiceEntity();
        entity.setTenantId(tenantContext.requireTenantId());
        entity.setStartAt(command.startAt());
        entity.setPickupLocation(command.pickupLocation().trim());
        entity.setDestination(command.destination().trim());
        entity.setType(command.type());
        entity.setDurationHours(command.durationHours());
        entity.setNotes(cleanNullable(command.notes()));
        entity.setPrice(command.price());
        entity.setExternalBookingReference(command.externalBookingReference());
        entity.setInternalBookingReference(generateInternalBookingReference());
        entity.setClientName(cleanNullable(command.clientName()));
        entity.setClientPhone(cleanNullable(command.clientPhone()));
        entity.setClientEmail(cleanNullable(command.clientEmail()));
        entity.setPassengersCount(command.passengersCount());
        entity.setItinerary(cleanNullable(command.itinerary()));
        entity.setStatus(initialStatus);
        entity.setServiceAssignmentType(assignmentType);
        entity.setPartnerId(command.partnerId());
        entity.setPricePartner(command.pricePartner());
        entity.setMargin(ServiceValidationSupport.calculateMargin(command.price(), command.pricePartner()));
        entity.setAssignedVehicleId(command.assignedVehicleId());

        ServiceDto result = ServiceMapper.toDto(serviceRepositoryPort.save(entity));
        log.info("action=service.create serviceId={} assignmentType={} status={} tenantId={} outcome=success",
            result.id(), assignmentType, initialStatus, entity.getTenantId());
        return result;
    }

    private void validateStartAt(LocalDateTime startAt) {
        if (startAt == null) {
            throw new ServiceValidationException("La data/ora di inizio e` obbligatoria");
        }
    }

    private String cleanNullable(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String generateInternalBookingReference() {
        String yearSuffix = String.format("%02d", LocalDate.now().getYear() % 100);
        int nextSequence = serviceRepositoryPort.findMaxInternalBookingSequenceForYear(yearSuffix) + 1;
        return nextSequence + "-" + yearSuffix;
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