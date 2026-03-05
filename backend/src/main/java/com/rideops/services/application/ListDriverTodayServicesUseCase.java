package com.rideops.services.application;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ListDriverTodayServicesUseCase {

    private final ServiceRepositoryPort serviceRepositoryPort;

    public ListDriverTodayServicesUseCase(ServiceRepositoryPort serviceRepositoryPort) {
        this.serviceRepositoryPort = serviceRepositoryPort;
    }

    public List<ServiceDto> execute(Long driverId) {
        LocalDate today = LocalDate.now();
        LocalDateTime start = today.atStartOfDay();
        LocalDateTime end = today.plusDays(1).atStartOfDay().minusNanos(1);

        return serviceRepositoryPort.findAllByAssignedDriverIdAndStartAtBetweenOrderByStartAtAsc(driverId, start, end)
            .stream()
            .map(ServiceMapper::toDto)
            .toList();
    }
}