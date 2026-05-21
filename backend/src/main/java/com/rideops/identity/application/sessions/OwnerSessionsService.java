package com.rideops.identity.application.sessions;

import com.rideops.identity.adapters.out.UserSessionRepository;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;

@Service
public class OwnerSessionsService {

    private final UserSessionRepository userSessionRepository;

    public OwnerSessionsService(UserSessionRepository userSessionRepository) {
        this.userSessionRepository = userSessionRepository;
    }

    public SessionsPageResponse listSessions(int days,
                                             Long tenantId,
                                             boolean anomalyOnly,
                                             boolean normalOnly,
                                             int page,
                                             int perPage,
                                             String search) {
        int safeDays = sanitizeDays(days);
        int safePage = Math.max(page, 0);
        int safePerPage = Math.clamp(perPage, 1, 100);
        String safeSearch = search == null ? "" : search.trim();

        OffsetDateTime since = OffsetDateTime.now(ZoneOffset.UTC).minusDays(safeDays);
        var rows = userSessionRepository.findSessionsPage(
            since,
            tenantId,
            anomalyOnly,
            normalOnly,
            safeSearch,
            PageRequest.of(safePage, safePerPage)
        );

        List<SessionItem> items = rows.getContent().stream()
            .map(row -> new SessionItem(
                row.getId(),
                row.getUserName(),
                row.getUserInitials(),
                row.getTenantName(),
                row.getCreatedAt() != null
                    ? row.getCreatedAt().atOffset(ZoneOffset.UTC)
                    : null,
                row.getIpAddress(),
                row.getCountryCode(),
                row.getCountryName(),
                row.getCity(),
                row.getUaBrowser(),
                row.getUaOs(),
                row.getDeviceType(),
                row.getAnomaly()
            ))
            .toList();

        return new SessionsPageResponse(rows.getTotalElements(), safePage, safePerPage, items);
    }

    public KpisResponse getKpis(int days) {
        int safeDays = sanitizeDays(days);
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);

        long total7d = userSessionRepository.countSince(now.minusDays(safeDays));
        long total24h = userSessionRepository.countSince(now.minusHours(24));
        long anomaliesTotal = userSessionRepository.countAnomaliesSince(now.minusDays(safeDays));
        long uniqueIps = userSessionRepository.countUniqueIpsSince(now.minusDays(safeDays));

        return new KpisResponse(total7d, total24h, anomaliesTotal, uniqueIps);
    }

    public HourlyResponse getHourly() {
        OffsetDateTime since = OffsetDateTime.now(ZoneOffset.UTC).minusHours(24);
        int[] buckets = new int[24];
        int[] anomalyBuckets = new int[24];

        userSessionRepository.countByHourSince(since).forEach(row -> {
            int hour = row.getHour() == null ? -1 : row.getHour();
            if (hour >= 0 && hour < 24) {
                buckets[hour] = row.getCount() == null ? 0 : row.getCount().intValue();
                anomalyBuckets[hour] = row.getAnomalyCount() == null ? 0 : row.getAnomalyCount().intValue();
            }
        });

        List<Integer> hours = new ArrayList<>(24);
        List<Integer> anomalyHours = new ArrayList<>(24);
        for (int value : buckets) {
            hours.add(value);
        }
        for (int value : anomalyBuckets) {
            anomalyHours.add(value);
        }
        return new HourlyResponse(hours, anomalyHours);
    }

    public TopIpsResponse getTopIps(int days) {
        int safeDays = sanitizeDays(days);
        OffsetDateTime since = OffsetDateTime.now(ZoneOffset.UTC).minusDays(safeDays);
        List<TopIpItem> ips = userSessionRepository.findTopIps(since).stream()
            .map(row -> new TopIpItem(
                row.getIp(),
                row.getCount() == null ? 0L : row.getCount(),
                row.getTenantName(),
                row.getCountryCode(),
                row.getCountryName(),
                row.getCity(),
                isSuspiciousIp(row.getIp())
            ))
            .toList();

        return new TopIpsResponse(ips);
    }

    public CountriesResponse getCountries(int days, boolean excludeUnknown) {
        int safeDays = sanitizeDays(days);
        OffsetDateTime since = OffsetDateTime.now(ZoneOffset.UTC).minusDays(safeDays);
        List<CountryItem> countries = userSessionRepository.findCountrySummary(since).stream()
            .filter(row -> !excludeUnknown || !isUnknownCountry(row.getCountryCode(), row.getCountryName()))
            .map(row -> new CountryItem(
                row.getCountryCode(),
                row.getCountryName(),
                row.getCount() == null ? 0L : row.getCount()
            ))
            .toList();
        return new CountriesResponse(countries);
    }

    private boolean isUnknownCountry(String countryCode, String countryName) {
        boolean missingCode = countryCode == null || countryCode.isBlank();
        boolean missingName = countryName == null || countryName.isBlank();
        return missingCode && missingName;
    }

    private int sanitizeDays(int days) {
        if (days <= 0) {
            return 7;
        }
        return Math.min(days, 90);
    }

    private boolean isSuspiciousIp(String ip) {
        if (ip == null || ip.isBlank()) {
            return true;
        }
        String normalized = ip.trim().toLowerCase();
        if ("unknown".equals(normalized)) {
            return true;
        }
        return !(normalized.contains(".") || normalized.contains(":"));
    }

    public record SessionsPageResponse(long total, int page, int perPage, List<SessionItem> sessions) {
    }

    public record SessionItem(Long id,
                              String userName,
                              String userInitials,
                              String tenantName,
                              OffsetDateTime createdAt,
                              String ipAddress,
                              String countryCode,
                              String countryName,
                              String city,
                              String uaBrowser,
                              String uaOs,
                              String deviceType,
                              String anomaly) {
    }

    public record KpisResponse(long total7d, long total24h, long anomaliesTotal, long uniqueIps) {
    }

    public record HourlyResponse(List<Integer> hours, List<Integer> anomalyHours) {
    }

    public record TopIpsResponse(List<TopIpItem> ips) {
    }

    public record CountriesResponse(List<CountryItem> countries) {
    }

    public record TopIpItem(String ip,
                            long count,
                            String tenantName,
                            String countryCode,
                            String countryName,
                            String city,
                            boolean suspicious) {
    }

    public record CountryItem(String countryCode, String countryName, long count) {
    }
}
