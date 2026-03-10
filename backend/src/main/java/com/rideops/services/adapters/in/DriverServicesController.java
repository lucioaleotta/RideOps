package com.rideops.services.adapters.in;

import com.rideops.identity.application.IdentityUserDetails;
import com.rideops.services.application.ListDriverServicesUseCase;
import com.rideops.services.application.ServiceDto;
import com.rideops.services.domain.ServiceStatus;
import com.rideops.services.domain.ServiceType;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/driver/services")
@PreAuthorize("hasAnyRole('ADMIN','DRIVER')")
public class DriverServicesController {

    private final ListDriverServicesUseCase listDriverServicesUseCase;

    public DriverServicesController(ListDriverServicesUseCase listDriverServicesUseCase) {
        this.listDriverServicesUseCase = listDriverServicesUseCase;
    }

    @GetMapping
    public List<ServiceDto> listFiltered(@AuthenticationPrincipal IdentityUserDetails user,
                                         @RequestParam(required = false)
                                         @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
                                         LocalDateTime from,
                                         @RequestParam(required = false)
                                         @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME)
                                         LocalDateTime to,
                                         @RequestParam(required = false) ServiceStatus status,
                                         @RequestParam(required = false) ServiceType type) {
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        // Single entry point for driver service listing, optionally constrained by time/status/type.
        return listDriverServicesUseCase.execute(user.getId(), from, to, status, type);
    }
}