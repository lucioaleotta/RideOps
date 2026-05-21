package com.rideops.identity.application.sessions;

import com.rideops.identity.adapters.out.UserSessionRepository;
import com.rideops.identity.application.IdentityUserDetails;
import com.maxmind.geoip2.DatabaseReader;
import com.maxmind.geoip2.model.CityResponse;
import jakarta.servlet.http.HttpServletRequest;
import java.io.File;
import java.io.IOException;
import java.net.InetAddress;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Locale;
import java.util.concurrent.CompletableFuture;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import ua_parser.Client;
import ua_parser.Parser;

@Service
public class LoginSessionRecorder {

    private static final Logger log = LoggerFactory.getLogger(LoginSessionRecorder.class);
    private static final ZoneId ROME_ZONE = ZoneId.of("Europe/Rome");
    private static final Parser UA_PARSER = new Parser();
    private static final DatabaseReader GEO_READER = initGeoReader();

    private final UserSessionRepository userSessionRepository;

    public LoginSessionRecorder(UserSessionRepository userSessionRepository) {
        this.userSessionRepository = userSessionRepository;
    }

    public void recordSuccessfulLogin(IdentityUserDetails principal, HttpServletRequest request) {
        LoginRequestContext requestContext = LoginRequestContext.from(request);
        CompletableFuture.runAsync(() -> saveSession(principal, requestContext));
    }

    private void saveSession(IdentityUserDetails principal, LoginRequestContext requestContext) {
        try {
            OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
            String ipAddress = extractIp(requestContext);
            String userAgentRaw = extractUserAgentRaw(requestContext);
            String userAgent = abbreviate(userAgentRaw, 1000);
            DeviceInfo deviceInfo = parseDeviceInfo(userAgentRaw);
            GeoInfo geoInfo = resolveGeoInfo(requestContext, ipAddress);
            String anomaly = detectAnomaly(
                principal.getId(),
                ipAddress,
                geoInfo.countryCode(),
                deviceInfo.uaBrowser(),
                deviceInfo.uaOs(),
                now
            );

            userSessionRepository.insertSession(
                principal.getId(),
                principal.getTenantId(),
                now,
                ipAddress,
                userAgent,
                userAgentRaw,
                deviceInfo.uaBrowser(),
                deviceInfo.uaOs(),
                geoInfo.countryCode(),
                geoInfo.countryName(),
                geoInfo.city(),
                deviceInfo.deviceType(),
                anomaly
            );
        } catch (Exception exception) {
            log.warn("action=user.session.record outcome=failure reason=save_error error=\"{}\"",
                exception.getMessage());
        }
    }

    private String detectAnomaly(Long userId,
                                 String ipAddress,
                                 String countryCode,
                                 String uaBrowser,
                                 String uaOs,
                                 OffsetDateTime now) {
        OffsetDateTime historyWindow = now.minusDays(90);
        long sessionCount90d = userSessionRepository.countUserSessionsSince(userId, historyWindow);

        if (ipAddress != null && userSessionRepository.countRecentByIp(ipAddress, now.minusMinutes(10)) >= 5) {
            return "Accessi multipli rapidi (possibile brute force)";
        }

        if (isCountryBasedCheckEligible(countryCode)) {
            String previousCountry = userSessionRepository.findRecentDifferentCountry(
                userId,
                now.minusHours(2),
                countryCode
            );
            if (previousCountry != null && !previousCountry.isBlank()) {
                return "Impossible travel (" + previousCountry + " -> " + countryCode + " in < 2h)";
            }
        }

        if (sessionCount90d >= 3 && isCountryBasedCheckEligible(countryCode)) {
            String usualCountry = userSessionRepository.findMostFrequentCountrySince(userId, historyWindow);
            if (usualCountry != null && !usualCountry.isBlank() && !usualCountry.equals(countryCode)) {
                return "Paese insolito (" + countryCode + " invece di " + usualCountry + ")";
            }
        }

        if (sessionCount90d >= 3) {
            long knownUaCount = userSessionRepository.countKnownUserAgent(userId, uaBrowser, uaOs, historyWindow);
            if (knownUaCount == 0) {
                return "Dispositivo mai visto (" + uaBrowser + " su " + uaOs + ")";
            }
        }

        if (isNightHour(now) && !hasFrequentNightLogins(userId, sessionCount90d, historyWindow)) {
            ZonedDateTime localRome = now.atZoneSameInstant(ROME_ZONE);
            return "Orario insolito (" + localRome.format(DateTimeFormatter.ofPattern("HH:mm")) + ")";
        }

        return null;
    }

    private boolean hasFrequentNightLogins(Long userId, long sessionCount90d, OffsetDateTime historyWindow) {
        if (sessionCount90d == 0) {
            return false;
        }
        long nightSessions = userSessionRepository.countNightSessionsSince(userId, historyWindow);
        return ((double) nightSessions / (double) sessionCount90d) > 0.20d;
    }

    private boolean isNightHour(OffsetDateTime instant) {
        int hour = instant.atZoneSameInstant(ROME_ZONE).getHour();
        return hour >= 0 && hour <= 5;
    }

    private String detectDeviceType(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) {
            return "unknown";
        }

        String ua = userAgent.toLowerCase(Locale.ROOT);
        if (ua.contains("ipad") || ua.contains("tablet")) {
            return "tablet";
        }
        if (ua.contains("mobi") || ua.contains("iphone") || ua.contains("android")) {
            return "mobile";
        }
        if (ua.contains("windows") || ua.contains("macintosh") || ua.contains("linux")) {
            return "desktop";
        }
        return "unknown";
    }

    private String extractUserAgentRaw(LoginRequestContext requestContext) {
        String ua = requestContext.userAgent();
        if (ua == null || ua.isBlank()) {
            return null;
        }
        return abbreviate(ua, 4000);
    }

    private DeviceInfo parseDeviceInfo(String userAgentRaw) {
        if (userAgentRaw == null || userAgentRaw.isBlank()) {
            return new DeviceInfo("unknown", "unknown", "unknown");
        }

        Client parsed = UA_PARSER.parse(userAgentRaw);
        String browser = normalizeUaPart(parsed == null || parsed.userAgent == null ? null : parsed.userAgent.family);
        String os = normalizeUaPart(parsed == null || parsed.os == null ? null : parsed.os.family);
        String deviceType = detectDeviceType(userAgentRaw);
        return new DeviceInfo(browser, os, deviceType);
    }

    private GeoInfo resolveGeoInfo(LoginRequestContext requestContext, String ipAddress) {
        if (ipAddress == null || ipAddress.isBlank()) {
            return new GeoInfo(null, null, null);
        }

        if (isLocalIp(ipAddress)) {
            return new GeoInfo("LOCAL", "Local Network", "Localhost");
        }

        GeoInfo dbGeo = resolveGeoFromLocalDb(ipAddress);
        if (dbGeo.countryCode() != null && !dbGeo.countryCode().isBlank()) {
            return dbGeo;
        }

        String countryCode = firstNonBlank(
            requestContext.xCountryCode(),
            requestContext.cfIpCountry(),
            requestContext.xVercelIpCountry()
        );
        String countryName = firstNonBlank(
            requestContext.xCountryName(),
            requestContext.xVercelIpCountryRegion()
        );
        String city = firstNonBlank(
            requestContext.xCity(),
            requestContext.xVercelIpCity()
        );

        if (countryCode == null) {
            return new GeoInfo(null, countryName, city);
        }
        return new GeoInfo(countryCode.toUpperCase(Locale.ROOT), countryName, city);
    }

    private GeoInfo resolveGeoFromLocalDb(String ipAddress) {
        if (GEO_READER == null) {
            return new GeoInfo(null, null, null);
        }

        try {
            InetAddress inetAddress = InetAddress.getByName(ipAddress);
            CityResponse response = GEO_READER.city(inetAddress);
            String countryCode = response.getCountry() == null ? null : response.getCountry().getIsoCode();
            String countryName = response.getCountry() == null ? null : response.getCountry().getName();
            String city = response.getCity() == null ? null : response.getCity().getName();
            return new GeoInfo(countryCode, countryName, city);
        } catch (Exception ignored) {
            return new GeoInfo(null, null, null);
        }
    }

    private String extractIp(LoginRequestContext requestContext) {
        String forwarded = requestContext.xForwardedFor();
        String candidate = null;

        if (forwarded != null && !forwarded.isBlank()) {
            String[] values = forwarded.split(",");
            if (values.length > 0) {
                candidate = values[0].trim();
            }
        }

        if (candidate == null || candidate.isBlank()) {
            candidate = requestContext.remoteAddr();
        }

        if (candidate == null || candidate.isBlank()) {
            return null;
        }

        String normalized = candidate.trim();
        if (normalized.startsWith("[") && normalized.endsWith("]")) {
            normalized = normalized.substring(1, normalized.length() - 1);
        }

        if (normalized.matches("^\\d{1,3}(?:\\.\\d{1,3}){3}:\\d{1,5}$")) {
            normalized = normalized.substring(0, normalized.lastIndexOf(':'));
        }

        if ("unknown".equalsIgnoreCase(normalized)) {
            return null;
        }

        if (!normalized.matches("^[0-9a-fA-F:.]+$")) {
            return null;
        }

        return normalized;
    }

    private boolean isCountryBasedCheckEligible(String countryCode) {
        return countryCode != null && !countryCode.isBlank() && !"LOCAL".equalsIgnoreCase(countryCode);
    }

    private boolean isLocalIp(String ipAddress) {
        String value = ipAddress.toLowerCase(Locale.ROOT);
        if ("127.0.0.1".equals(value) || "::1".equals(value)) {
            return true;
        }
        if (value.startsWith("10.") || value.startsWith("192.168.")) {
            return true;
        }
        if (value.startsWith("172.")) {
            String[] parts = value.split("\\.");
            if (parts.length > 1) {
                try {
                    int secondOctet = Integer.parseInt(parts[1]);
                    if (secondOctet >= 16 && secondOctet <= 31) {
                        return true;
                    }
                } catch (NumberFormatException ignored) {
                    return false;
                }
            }
        }
        return value.startsWith("fc") || value.startsWith("fd") || value.startsWith("fe80:");
    }

    private String normalizeUaPart(String value) {
        if (value == null || value.isBlank()) {
            return "unknown";
        }
        return abbreviate(value.trim(), 50);
    }

    private String abbreviate(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        return value.length() > maxLength ? value.substring(0, maxLength) : value;
    }

    private String firstNonBlank(String... values) {
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                return value.trim();
            }
        }
        return null;
    }

    private static DatabaseReader initGeoReader() {
        String geoDbPath = System.getenv("GEOIP_DB_PATH");
        if (geoDbPath == null || geoDbPath.isBlank()) {
            return null;
        }

        File dbFile = new File(geoDbPath.trim());
        if (!dbFile.exists() || !dbFile.isFile()) {
            return null;
        }

        try {
            return new DatabaseReader.Builder(dbFile).build();
        } catch (IOException exception) {
            return null;
        }
    }

    private record DeviceInfo(String uaBrowser, String uaOs, String deviceType) {
    }

    private record GeoInfo(String countryCode, String countryName, String city) {
    }

    private record LoginRequestContext(
        String remoteAddr,
        String xForwardedFor,
        String userAgent,
        String xCountryCode,
        String cfIpCountry,
        String xVercelIpCountry,
        String xCountryName,
        String xVercelIpCountryRegion,
        String xCity,
        String xVercelIpCity
    ) {
        private static LoginRequestContext from(HttpServletRequest request) {
            return new LoginRequestContext(
                request.getRemoteAddr(),
                request.getHeader("X-Forwarded-For"),
                request.getHeader("User-Agent"),
                request.getHeader("X-Country-Code"),
                request.getHeader("CF-IPCountry"),
                request.getHeader("X-Vercel-IP-Country"),
                request.getHeader("X-Country-Name"),
                request.getHeader("X-Vercel-IP-Country-Region"),
                request.getHeader("X-City"),
                request.getHeader("X-Vercel-IP-City")
            );
        }
    }
}
