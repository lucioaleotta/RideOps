package com.rideops.absences.adapters.in;

import com.rideops.absences.application.CalendarioAssenzaDto;
import com.rideops.absences.application.CalendarioAssenzeUseCase;
import java.time.LocalDate;
import java.util.List;
import org.springframework.lang.NonNull;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/calendario-assenze")
@PreAuthorize("hasRole('GESTIONALE')")
public class CalendarioAssenzeController {

    private final CalendarioAssenzeUseCase calendarioAssenzeUseCase;

    public CalendarioAssenzeController(CalendarioAssenzeUseCase calendarioAssenzeUseCase) {
        this.calendarioAssenzeUseCase = calendarioAssenzeUseCase;
    }

    @GetMapping
    public List<CalendarioAssenzaDto> getCalendario(@RequestParam @NonNull LocalDate from,
                                                     @RequestParam @NonNull LocalDate to) {
        return calendarioAssenzeUseCase.execute(from, to);
    }
}