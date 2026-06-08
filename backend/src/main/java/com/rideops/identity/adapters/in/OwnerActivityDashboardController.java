package com.rideops.identity.adapters.in;

import com.rideops.identity.application.dashboard.OwnerActivityDashboardService;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/owner/dashboard")
@PreAuthorize("hasRole('ADMIN')")
public class OwnerActivityDashboardController {

    private final OwnerActivityDashboardService dashboardService;

    public OwnerActivityDashboardController(OwnerActivityDashboardService dashboardService) {
        this.dashboardService = dashboardService;
    }

    @GetMapping("/kpis")
    public OwnerActivityDashboardService.KpisResponse kpis(
        @RequestParam(name = "months", defaultValue = "3") int months
    ) {
        return dashboardService.getKpis(months);
    }

    @GetMapping("/services-by-month")
    public OwnerActivityDashboardService.ServicesByMonthResponse servicesByMonth(
        @RequestParam(name = "months", defaultValue = "3") int months
    ) {
        return dashboardService.getServicesByMonth(months);
    }

    @GetMapping("/top5")
    public OwnerActivityDashboardService.Top5Response top5(
        @RequestParam(name = "months", defaultValue = "3") int months
    ) {
        return dashboardService.getTop5(months);
    }

    @GetMapping("/clients")
    public OwnerActivityDashboardService.ClientsResponse clients(
        @RequestParam(name = "months", defaultValue = "3") int months,
        @RequestParam(name = "page", defaultValue = "0") @Min(0) int page,
        @RequestParam(name = "per_page", defaultValue = "15") @Min(1) @Max(100) int perPage
    ) {
        return dashboardService.getClients(months, page, perPage);
    }
}
