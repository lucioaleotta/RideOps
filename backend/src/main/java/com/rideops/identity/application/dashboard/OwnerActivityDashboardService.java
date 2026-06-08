package com.rideops.identity.application.dashboard;

import com.rideops.identity.adapters.out.OwnerActivityDashboardRepository;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
public class OwnerActivityDashboardService {

    private static final List<Integer> ALLOWED_MONTHS = List.of(1, 3, 6, 12);
    private static final List<String> PALETTE = List.of("#D85A30", "#185FA5", "#534AB7", "#378ADD", "#639922");
    private static final DateTimeFormatter MONTH_LABEL = DateTimeFormatter.ofPattern("MMM", Locale.ENGLISH);

    private final OwnerActivityDashboardRepository repository;

    public OwnerActivityDashboardService(OwnerActivityDashboardRepository repository) {
        this.repository = repository;
    }

    public KpisResponse getKpis(int months) {
        int safeMonths = sanitizeMonths(months);
        OffsetDateTime since = nowUtc().minusMonths(safeMonths);

        long totalServices = repository.countServicesSince(since);
        long activeClients = repository.countActiveClientsSince(since);
        long totalClients = repository.countTotalClients();
        long avgServicesPerClient = totalClients == 0 ? 0 : Math.round((double) totalServices / totalClients);

        return new KpisResponse(totalServices, activeClients, totalClients, avgServicesPerClient);
    }

    public ServicesByMonthResponse getServicesByMonth(int months) {
        int safeMonths = sanitizeMonths(months);
        OffsetDateTime now = nowUtc();
        OffsetDateTime since = now.minusMonths(safeMonths);

        List<OwnerActivityDashboardRepository.MonthlyTenantServicesProjection> rows = repository
            .findMonthlyServicesForTopTenantsSince(since);

        List<LocalDate> monthDates = monthWindow(since.toLocalDate(), now.toLocalDate());
        List<String> labels = monthDates.stream().map(date -> MONTH_LABEL.format(date)).toList();
        Map<LocalDate, Integer> monthIndex = new HashMap<>();
        for (int i = 0; i < monthDates.size(); i++) {
            monthIndex.put(monthDates.get(i), i);
        }

        Map<Long, TenantSeriesBuilder> builders = new LinkedHashMap<>();
        for (OwnerActivityDashboardRepository.MonthlyTenantServicesProjection row : rows) {
            TenantSeriesBuilder builder = builders.computeIfAbsent(
                row.getTenantId(),
                tenantId -> new TenantSeriesBuilder(
                    tenantId,
                    row.getTenantName(),
                    row.getRank() == null ? Integer.MAX_VALUE : row.getRank(),
                    colorForTenant(tenantId),
                    new ArrayList<>(java.util.Collections.nCopies(labels.size(), 0L))
                )
            );

            Integer index = monthIndex.get(row.getMonthDate());
            if (index != null) {
                builder.data.set(index, row.getServices() == null ? 0L : row.getServices());
            }
        }

        List<TenantDataset> datasets = builders.values().stream()
            .sorted(Comparator.comparingInt(TenantSeriesBuilder::rank))
            .map(builder -> new TenantDataset(
                builder.tenantId,
                builder.tenantName,
                builder.color,
                builder.data
            ))
            .toList();

        return new ServicesByMonthResponse(labels, datasets);
    }

    public Top5Response getTop5(int months) {
        int safeMonths = sanitizeMonths(months);
        OffsetDateTime since = nowUtc().minusMonths(safeMonths);
        double weeks = safeMonths * 4.33;

        List<Top5Item> items = repository.findTop5ByScoreSince(since, weeks).stream()
            .map(row -> new Top5Item(
                row.getTenantId(),
                row.getTenantName(),
                row.getTotalServices() == null ? 0 : row.getTotalServices(),
                roundOneDecimal((row.getTotalSessions() == null ? 0D : row.getTotalSessions()) / weeks),
                row.getScore() == null ? 0 : row.getScore()
            ))
            .toList();

        return new Top5Response(items);
    }

    public ClientsResponse getClients(int months, int page, int perPage) {
        int safeMonths = sanitizeMonths(months);
        int safePage = Math.max(page, 0);
        int safePerPage = Math.max(1, Math.min(perPage, 100));

        OffsetDateTime now = nowUtc();
        OffsetDateTime since = now.minusMonths(safeMonths);
        OffsetDateTime midpoint = now.minusDays(halfDaysForPeriod(safeMonths));
        double weeks = safeMonths * 4.33;

        long total = repository.countTotalClients();
        boolean usePagination = total >= 20;

        int effectivePage = usePagination ? safePage : 0;
        int effectivePerPage = usePagination ? safePerPage : Math.max(1, (int) Math.min(total, 10_000));
        int offset = effectivePage * effectivePerPage;

        List<ClientItem> clients = repository.findClientsMetrics(
                since,
                midpoint,
                weeks,
                effectivePerPage,
                offset
            )
            .stream()
            .map(row -> new ClientItem(
                row.getTenantId(),
                row.getTenantName(),
                planLabel(row.getPlan()),
                row.getPlanLimit() == null ? 0 : row.getPlanLimit(),
                row.getTotalServices() == null ? 0 : row.getTotalServices(),
                row.getAvgLoginsPerWeek() == null ? 0D : row.getAvgLoginsPerWeek(),
                row.getLimitPct() == null ? 0 : row.getLimitPct(),
                row.getTrendPct() == null ? 0 : row.getTrendPct()
            ))
            .toList();

        return new ClientsResponse(clients, total, effectivePage, effectivePerPage, usePagination);
    }

    private int sanitizeMonths(int months) {
        if (!ALLOWED_MONTHS.contains(months)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "months must be one of: 1, 3, 6, 12");
        }
        return months;
    }

    private OffsetDateTime nowUtc() {
        return OffsetDateTime.now(ZoneOffset.UTC);
    }

    private String colorForTenant(Long tenantId) {
        if (tenantId == null) {
            return PALETTE.get(0);
        }
        int index = Math.floorMod(tenantId.intValue(), PALETTE.size());
        return PALETTE.get(index);
    }

    private List<LocalDate> monthWindow(LocalDate from, LocalDate to) {
        LocalDate start = from.withDayOfMonth(1);
        LocalDate end = to.withDayOfMonth(1);
        List<LocalDate> months = new ArrayList<>();

        LocalDate cursor = start;
        while (!cursor.isAfter(end)) {
            months.add(cursor);
            cursor = cursor.plusMonths(1);
        }

        if (months.isEmpty()) {
            months.add(end);
        }

        return months;
    }

    private int halfDaysForPeriod(int months) {
        if (months == 1) {
            return 15;
        }
        return (int) Math.round(months * 30.0 / 2.0);
    }

    private double roundOneDecimal(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private String planLabel(String plan) {
        if (plan == null) {
            return "Unknown";
        }
        return switch (plan) {
            case "STARTER" -> "Starter";
            case "PRO" -> "Business";
            case "ENTERPRISE" -> "Enterprise";
            default -> plan;
        };
    }

    private record TenantSeriesBuilder(Long tenantId,
                                       String tenantName,
                                       int rank,
                                       String color,
                                       List<Long> data) {
    }

    public record KpisResponse(long total_services,
                               long active_clients,
                               long total_clients,
                               long avg_services_per_client) {
    }

    public record ServicesByMonthResponse(List<String> labels, List<TenantDataset> datasets) {
    }

    public record TenantDataset(Long tenant_id, String tenant_name, String color, List<Long> data) {
    }

    public record Top5Response(List<Top5Item> top5) {
    }

    public record Top5Item(Long tenant_id,
                           String tenant_name,
                           long total_services,
                           double avg_logins_per_week,
                           int score) {
    }

    public record ClientsResponse(List<ClientItem> clients,
                                  long total,
                                  int page,
                                  int per_page,
                                  boolean paginated) {
    }

    public record ClientItem(Long tenant_id,
                             String tenant_name,
                             String plan,
                             int plan_limit,
                             long total_services,
                             double avg_logins_per_week,
                             int limit_pct,
                             int trend_pct) {
    }
}
