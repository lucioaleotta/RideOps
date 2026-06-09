package com.rideops.identity.application.dashboard;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.rideops.identity.adapters.out.OwnerActivityDashboardRepository;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.web.server.ResponseStatusException;

@ExtendWith(MockitoExtension.class)
class OwnerActivityDashboardServiceTest {

    @Mock
    private OwnerActivityDashboardRepository repository;

    private OwnerActivityDashboardService service;

    @BeforeEach
    void setUp() {
        service = new OwnerActivityDashboardService(repository);
    }

    @Test
    void getKpisComputesAverageAndUsesAllowedMonths() {
        when(repository.countServicesSince(any(OffsetDateTime.class))).thenReturn(20L);
        when(repository.countActiveClientsSince(any(OffsetDateTime.class))).thenReturn(5L);
        when(repository.countTotalClients()).thenReturn(4L);

        OwnerActivityDashboardService.KpisResponse response = service.getKpis(3);

        assertEquals(20L, response.total_services());
        assertEquals(5L, response.active_clients());
        assertEquals(4L, response.total_clients());
        assertEquals(5L, response.avg_services_per_client());
    }

    @Test
    void getKpisRejectsInvalidMonths() {
        ResponseStatusException exception = assertThrows(
            ResponseStatusException.class,
            () -> service.getKpis(2)
        );

        assertEquals(400, exception.getStatusCode().value());
    }

    @Test
    void getServicesByMonthBuildsDatasetFromRepositoryRows() {
        OwnerActivityDashboardRepository.MonthlyTenantServicesProjection row = mock(
            OwnerActivityDashboardRepository.MonthlyTenantServicesProjection.class
        );

        LocalDate currentMonth = LocalDate.now().withDayOfMonth(1);
        when(row.getTenantId()).thenReturn(7L);
        when(row.getTenantName()).thenReturn("Acme");
        when(row.getRank()).thenReturn(1);
        when(row.getMonthDate()).thenReturn(currentMonth);
        when(row.getServices()).thenReturn(12L);

        when(repository.findMonthlyServicesForTopTenantsSince(any(OffsetDateTime.class)))
            .thenReturn(List.of(row));

        OwnerActivityDashboardService.ServicesByMonthResponse response = service.getServicesByMonth(1);

        assertEquals(1, response.datasets().size());
        OwnerActivityDashboardService.TenantDataset dataset = response.datasets().get(0);
        assertEquals(7L, dataset.tenant_id());
        assertEquals("Acme", dataset.tenant_name());
        assertEquals(response.labels().size(), dataset.data().size());
        assertEquals(12L, dataset.data().get(dataset.data().size() - 1));
    }

    @Test
    void getTop5MapsRowsAndRoundsAverageLogins() {
        OwnerActivityDashboardRepository.Top5TenantProjection row = mock(
            OwnerActivityDashboardRepository.Top5TenantProjection.class
        );

        when(row.getTenantId()).thenReturn(10L);
        when(row.getTenantName()).thenReturn("Beta");
        when(row.getTotalServices()).thenReturn(17L);
        when(row.getTotalSessions()).thenReturn(9L);
        when(row.getScore()).thenReturn(42);

        when(repository.findTop5ByScoreSince(any(OffsetDateTime.class), eq(4.33)))
            .thenReturn(List.of(row));

        OwnerActivityDashboardService.Top5Response response = service.getTop5(1);

        assertEquals(1, response.top5().size());
        OwnerActivityDashboardService.Top5Item item = response.top5().get(0);
        assertEquals(10L, item.tenant_id());
        assertEquals("Beta", item.tenant_name());
        assertEquals(17L, item.total_services());
        assertEquals(2.1, item.avg_logins_per_week());
        assertEquals(42, item.score());
    }

    @Test
    void getClientsDisablesPaginationWhenTenantsAreLessThanTwenty() {
        OwnerActivityDashboardRepository.ClientMetricsProjection row = mock(
            OwnerActivityDashboardRepository.ClientMetricsProjection.class
        );

        when(row.getTenantId()).thenReturn(3L);
        when(row.getTenantName()).thenReturn("Tenant Three");
        when(row.getPlan()).thenReturn("PRO");
        when(row.getPlanLimit()).thenReturn(500);
        when(row.getTotalServices()).thenReturn(50L);
        when(row.getAvgLoginsPerWeek()).thenReturn(6.4);
        when(row.getLimitPct()).thenReturn(10);
        when(row.getTrendPct()).thenReturn(5);

        when(repository.countTotalClients()).thenReturn(10L);
        when(repository.findClientsMetrics(any(OffsetDateTime.class), any(OffsetDateTime.class), eq(12.99), eq(10), eq(0)))
            .thenReturn(List.of(row));

        OwnerActivityDashboardService.ClientsResponse response = service.getClients(3, 7, 200);

        assertEquals(1, response.clients().size());
        assertEquals("Business", response.clients().get(0).plan());
        assertEquals(0, response.page());
        assertEquals(10, response.per_page());
        assertEquals(false, response.paginated());
        verify(repository).findClientsMetrics(any(OffsetDateTime.class), any(OffsetDateTime.class), eq(12.99), eq(10), eq(0));
    }

    @Test
    void getClientsUsesRequestedPaginationForLargeTenantSets() {
        when(repository.countTotalClients()).thenReturn(100L);
        when(repository.findClientsMetrics(any(OffsetDateTime.class), any(OffsetDateTime.class), eq(25.98), eq(15), eq(30)))
            .thenReturn(List.of());

        OwnerActivityDashboardService.ClientsResponse response = service.getClients(6, 2, 15);

        assertEquals(2, response.page());
        assertEquals(15, response.per_page());
        assertEquals(true, response.paginated());
        verify(repository).findClientsMetrics(any(OffsetDateTime.class), any(OffsetDateTime.class), eq(25.98), eq(15), eq(30));
    }
}
