package com.rideops.identity.adapters.in;

import com.rideops.identity.application.sessions.OwnerSessionsService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/owner/sessions")
@PreAuthorize("hasRole('ADMIN')")
public class OwnerSessionsController {

    private final OwnerSessionsService ownerSessionsService;

    public OwnerSessionsController(OwnerSessionsService ownerSessionsService) {
        this.ownerSessionsService = ownerSessionsService;
    }

    @GetMapping
    public OwnerSessionsService.SessionsPageResponse listSessions(
        @RequestParam(name = "days", defaultValue = "7") int days,
        @RequestParam(name = "tenant_id", required = false) Long tenantId,
        @RequestParam(name = "anomaly_only", defaultValue = "false") boolean anomalyOnly,
        @RequestParam(name = "normal_only", defaultValue = "false") boolean normalOnly,
        @RequestParam(name = "page", defaultValue = "0") int page,
        @RequestParam(name = "per_page", defaultValue = "12") int perPage,
        @RequestParam(name = "search", required = false) String search
    ) {
        return ownerSessionsService.listSessions(days, tenantId, anomalyOnly, normalOnly, page, perPage, search);
    }

    @GetMapping("/kpis")
    public OwnerSessionsService.KpisResponse kpis(
        @RequestParam(name = "days", defaultValue = "7") int days
    ) {
        return ownerSessionsService.getKpis(days);
    }

    @GetMapping("/hourly")
    public OwnerSessionsService.HourlyResponse hourly() {
        return ownerSessionsService.getHourly();
    }

    @GetMapping("/top-ips")
    public OwnerSessionsService.TopIpsResponse topIps(
        @RequestParam(name = "days", defaultValue = "7") int days
    ) {
        return ownerSessionsService.getTopIps(days);
    }

    @GetMapping("/countries")
    public OwnerSessionsService.CountriesResponse countries(
        @RequestParam(name = "days", defaultValue = "7") int days,
        @RequestParam(name = "exclude_unknown", defaultValue = "false") boolean excludeUnknown
    ) {
        return ownerSessionsService.getCountries(days, excludeUnknown);
    }
}
