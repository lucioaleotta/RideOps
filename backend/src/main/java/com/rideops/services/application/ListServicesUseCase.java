package com.rideops.services.application;

import com.rideops.partners.adapters.out.PartnerRepository;
import com.rideops.multitenancy.TenantContext;
import com.rideops.services.adapters.out.RideServiceEntity;
import com.rideops.services.domain.ServiceStatus;
import com.rideops.services.domain.ServiceType;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

@Service
public class ListServicesUseCase {

    private final ServiceRepositoryPort serviceRepositoryPort;
    private final PartnerRepository partnerRepository;
    private final TenantContext tenantContext;

    public ListServicesUseCase(ServiceRepositoryPort serviceRepositoryPort,
                               PartnerRepository partnerRepository,
                               TenantContext tenantContext) {
        this.serviceRepositoryPort = serviceRepositoryPort;
        this.partnerRepository = partnerRepository;
        this.tenantContext = tenantContext;
    }

    public List<ServiceDto> execute() {
        return mapWithPartnerNames(serviceRepositoryPort.findAllByOrderByStartAtDesc());
    }

    public List<ServiceDto> execute(LocalDateTime from,
                                    LocalDateTime to,
                                    Long driverId,
                                    ServiceStatus status,
                                    ServiceType type) {
        boolean hasFilters = from != null || to != null || driverId != null || status != null || type != null;

        if (!hasFilters) {
            return execute();
        }

        return mapWithPartnerNames(serviceRepositoryPort.findByFilters(from, to, driverId, status, type));
    }

    private List<ServiceDto> mapWithPartnerNames(List<RideServiceEntity> entities) {
        Long tenantId = tenantContext.getTenantIdOrNull();
        if (tenantId == null) {
            return entities.stream().map(ServiceMapper::toDto).toList();
        }
        Map<Long, String> partnerNames = partnerRepository
            .findAllByTenantIdOrderByRagioneSocialeAsc(tenantId)
            .stream()
            .collect(Collectors.toMap(
                p -> p.getId(),
                p -> p.getRagioneSociale()
            ));

        return entities.stream()
            .map(entity -> ServiceMapper.toDto(
                entity,
                entity.getPartnerId() != null ? partnerNames.get(entity.getPartnerId()) : null,
                entity.getOutgoingPartnerId() != null ? partnerNames.get(entity.getOutgoingPartnerId()) : null
            ))
            .toList();
    }
}