package com.rideops.absences.adapters.in;

import com.rideops.absences.application.SaldiDriverService;
import com.rideops.absences.application.SaldoAssenzaDto;
import com.rideops.identity.application.IdentityUserDetails;
import com.rideops.identity.domain.UserRole;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/driver/{driverId}/saldi")
@PreAuthorize("hasAnyRole('GESTIONALE','DRIVER')")
public class SaldiDriverController {

    private final SaldiDriverService saldiDriverService;

    public SaldiDriverController(SaldiDriverService saldiDriverService) {
        this.saldiDriverService = saldiDriverService;
    }

    @GetMapping
    public List<SaldoAssenzaDto> getSaldi(@PathVariable long driverId,
                                         @AuthenticationPrincipal IdentityUserDetails principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Non autorizzato");
        }
        if (principal.getRole() == UserRole.DRIVER && principal.getId() != driverId) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Driver non trovato");
        }
        return saldiDriverService.getSaldi(driverId);
    }
}