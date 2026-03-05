package com.rideops.services.application;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ListDriverUpcomingServicesUseCase {

    private final ServiceRepositoryPort serviceRepositoryPort;

    public ListDriverUpcomingServicesUseCase(ServiceRepositoryPort serviceRepositoryPort) {
        this.serviceRepositoryPort = serviceRepositoryPort;
    }

    public List<ServiceDto> execute(Long driverId) {
        LocalDateTime afterToday = LocalDate.now().plusDays(1).atStartOfDay();
        return serviceRepositoryPort.findAllByAssignedDriverIdAndStartAtGreaterThanOrderByStartAtAsc(driverId, afterToday)
            .stream()
            .map(ServiceMapper::toDto)
            .toList();
    }
}