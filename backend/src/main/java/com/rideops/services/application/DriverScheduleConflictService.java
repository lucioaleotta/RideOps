package com.rideops.services.application;

import com.rideops.services.adapters.out.RideServiceEntity;
import com.rideops.services.domain.ServiceStatus;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import org.springframework.lang.NonNull;
import org.springframework.stereotype.Service;

@Service
public class DriverScheduleConflictService {

    private final ServiceRepositoryPort serviceRepositoryPort;

    public DriverScheduleConflictService(ServiceRepositoryPort serviceRepositoryPort) {
        this.serviceRepositoryPort = serviceRepositoryPort;
    }

    public List<DriverServiceConflict> findConflicts(@NonNull Long driverId,
                                                      LocalDate dataInizio,
                                                      LocalDate dataFine,
                                                      boolean giornataIntera,
                                                      LocalTime oraInizio,
                                                      LocalTime oraFine) {
        if (dataInizio == null || dataFine == null) {
            throw new ServiceValidationException("Le date sono obbligatorie per verificare i conflitti");
        }
        List<TimeWindow> absenceWindows = new ArrayList<>();
        if (giornataIntera) {
            absenceWindows.add(new TimeWindow(dataInizio.atStartOfDay(), dataFine.plusDays(1).atStartOfDay()));
        } else {
            for (LocalDate day = dataInizio; !day.isAfter(dataFine); day = day.plusDays(1)) {
                absenceWindows.add(new TimeWindow(LocalDateTime.of(day, oraInizio), LocalDateTime.of(day, oraFine)));
            }
        }

        LocalDateTime searchFrom = dataInizio.minusDays(1).atStartOfDay();
        LocalDateTime searchTo = dataFine.plusDays(1).atStartOfDay();
        return serviceRepositoryPort.findByFilters(searchFrom, searchTo, driverId, ServiceStatus.ASSIGNED, null)
            .stream()
            .filter(service -> absenceWindows.stream().anyMatch(window -> overlaps(service, window)))
            .map(this::toConflict)
            .toList();
    }

    private boolean overlaps(RideServiceEntity service, TimeWindow absence) {
        LocalDateTime serviceStart = service.getStartAt();
        LocalDateTime serviceEnd = serviceStart.plusHours(service.getDurationHours() == null ? 1 : service.getDurationHours());
        return serviceStart.isBefore(absence.end()) && serviceEnd.isAfter(absence.start());
    }

    private DriverServiceConflict toConflict(RideServiceEntity service) {
        return new DriverServiceConflict(
            service.getId(), service.getStartAt(), service.getDurationHours(),
            service.getPickupLocation(), service.getDestination());
    }

    private record TimeWindow(LocalDateTime start, LocalDateTime end) { }
}