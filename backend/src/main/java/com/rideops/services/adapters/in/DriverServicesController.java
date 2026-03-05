package com.rideops.services.adapters.in;

import com.rideops.identity.application.IdentityUserDetails;
import com.rideops.services.application.ListDriverTodayServicesUseCase;
import com.rideops.services.application.ListDriverUpcomingServicesUseCase;
import com.rideops.services.application.ServiceDto;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/driver/services")
@PreAuthorize("hasAnyRole('ADMIN','DRIVER')")
public class DriverServicesController {

    private final ListDriverTodayServicesUseCase listDriverTodayServicesUseCase;
    private final ListDriverUpcomingServicesUseCase listDriverUpcomingServicesUseCase;

    public DriverServicesController(ListDriverTodayServicesUseCase listDriverTodayServicesUseCase,
                                    ListDriverUpcomingServicesUseCase listDriverUpcomingServicesUseCase) {
        this.listDriverTodayServicesUseCase = listDriverTodayServicesUseCase;
        this.listDriverUpcomingServicesUseCase = listDriverUpcomingServicesUseCase;
    }

    @GetMapping("/today")
    public List<ServiceDto> today(@AuthenticationPrincipal IdentityUserDetails user) {
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        return listDriverTodayServicesUseCase.execute(user.getId());
    }

    @GetMapping("/upcoming")
    public List<ServiceDto> upcoming(@AuthenticationPrincipal IdentityUserDetails user) {
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        return listDriverUpcomingServicesUseCase.execute(user.getId());
    }
}