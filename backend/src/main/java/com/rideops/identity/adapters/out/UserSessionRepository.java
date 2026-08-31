package com.rideops.identity.adapters.out;

import java.time.Instant;
import java.time.OffsetDateTime;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

public interface UserSessionRepository extends JpaRepository<UserSessionEntity, Long> {

    @Modifying
    @Transactional
    @Query(
        value = """
            INSERT INTO user_sessions (
                user_id,
                tenant_id,
                created_at,
                ip_address,
                user_agent,
                user_agent_raw,
                ua_browser,
                ua_os,
                country_code,
                country_name,
                city,
                device_type,
                anomaly
            ) VALUES (
                :userId,
                :tenantId,
                :createdAt,
                CAST(:ipAddress AS inet),
                :userAgent,
                :userAgentRaw,
                :uaBrowser,
                :uaOs,
                :countryCode,
                :countryName,
                :city,
                :deviceType,
                :anomaly
            )
            """,
        nativeQuery = true
    )
    void insertSession(@Param("userId") Long userId,
                       @Param("tenantId") Long tenantId,
                       @Param("createdAt") OffsetDateTime createdAt,
                       @Param("ipAddress") String ipAddress,
                       @Param("userAgent") String userAgent,
                       @Param("userAgentRaw") String userAgentRaw,
                       @Param("uaBrowser") String uaBrowser,
                       @Param("uaOs") String uaOs,
                       @Param("countryCode") String countryCode,
                       @Param("countryName") String countryName,
                       @Param("city") String city,
                       @Param("deviceType") String deviceType,
                       @Param("anomaly") String anomaly);

    @Query("""
        SELECT COUNT(us)
        FROM UserSessionEntity us
        WHERE us.createdAt >= :since
        """)
    long countSince(@Param("since") OffsetDateTime since);

    @Query("""
        SELECT COUNT(us)
        FROM UserSessionEntity us
        WHERE us.createdAt >= :since
          AND us.anomaly IS NOT NULL
        """)
    long countAnomaliesSince(@Param("since") OffsetDateTime since);

    @Query("""
        SELECT COUNT(DISTINCT us.ipAddress)
        FROM UserSessionEntity us
        WHERE us.createdAt >= :since
          AND us.ipAddress IS NOT NULL
        """)
    long countUniqueIpsSince(@Param("since") OffsetDateTime since);

    @Query(
        value = """
            SELECT
                us.id AS id,
                COALESCE(NULLIF(TRIM(CONCAT(COALESCE(au.first_name, ''), ' ', COALESCE(au.last_name, ''))), ''), au.user_id) AS userName,
                CASE
                    WHEN COALESCE(au.first_name, '') <> '' OR COALESCE(au.last_name, '') <> ''
                        THEN UPPER(CONCAT(SUBSTRING(COALESCE(au.first_name, 'X'), 1, 1), SUBSTRING(COALESCE(au.last_name, 'X'), 1, 1)))
                    ELSE UPPER(SUBSTRING(au.user_id, 1, 2))
                END AS userInitials,
                COALESCE(t.business_name, 'Admin') AS tenantName,
                us.created_at AS createdAt,
                COALESCE(HOST(us.ip_address), 'unknown') AS ipAddress,
                us.country_code AS countryCode,
                us.country_name AS countryName,
                us.city AS city,
                COALESCE(us.ua_browser, 'unknown') AS uaBrowser,
                COALESCE(us.ua_os, 'unknown') AS uaOs,
                us.device_type AS deviceType,
                us.anomaly AS anomaly
            FROM user_sessions us
            JOIN app_user au ON au.id = us.user_id
            LEFT JOIN tenant t ON t.id = us.tenant_id
            WHERE us.created_at >= :since
              AND (:tenantId IS NULL OR us.tenant_id = :tenantId)
              AND (:anomalyOnly = FALSE OR us.anomaly IS NOT NULL)
              AND (:normalOnly = FALSE OR us.anomaly IS NULL)
              AND (
                    :search = '' OR
                    au.user_id ILIKE CONCAT('%', :search, '%') OR
                    COALESCE(au.first_name, '') ILIKE CONCAT('%', :search, '%') OR
                    COALESCE(au.last_name, '') ILIKE CONCAT('%', :search, '%') OR
                    COALESCE(t.business_name, '') ILIKE CONCAT('%', :search, '%')
              )
            ORDER BY us.created_at DESC
            """,
        countQuery = """
            SELECT COUNT(*)
            FROM user_sessions us
            JOIN app_user au ON au.id = us.user_id
            LEFT JOIN tenant t ON t.id = us.tenant_id
            WHERE us.created_at >= :since
              AND (:tenantId IS NULL OR us.tenant_id = :tenantId)
              AND (:anomalyOnly = FALSE OR us.anomaly IS NOT NULL)
              AND (:normalOnly = FALSE OR us.anomaly IS NULL)
              AND (
                    :search = '' OR
                    au.user_id ILIKE CONCAT('%', :search, '%') OR
                    COALESCE(au.first_name, '') ILIKE CONCAT('%', :search, '%') OR
                    COALESCE(au.last_name, '') ILIKE CONCAT('%', :search, '%') OR
                    COALESCE(t.business_name, '') ILIKE CONCAT('%', :search, '%')
              )
            """,
        nativeQuery = true
    )
    Page<SessionRowProjection> findSessionsPage(
        @Param("since") OffsetDateTime since,
        @Param("tenantId") Long tenantId,
        @Param("anomalyOnly") boolean anomalyOnly,
        @Param("normalOnly") boolean normalOnly,
        @Param("search") String search,
        Pageable pageable
    );

    @Query(
        value = """
            SELECT
                EXTRACT(HOUR FROM us.created_at)::int AS hour,
                COUNT(*)::bigint AS count,
                COUNT(*) FILTER (WHERE us.anomaly IS NOT NULL)::bigint AS anomalyCount
            FROM user_sessions us
            WHERE us.created_at >= :since
            GROUP BY EXTRACT(HOUR FROM us.created_at)
            """,
        nativeQuery = true
    )
    java.util.List<HourlyRowProjection> countByHourSince(@Param("since") OffsetDateTime since);

    @Query(
        value = """
            SELECT
                COALESCE(HOST(us.ip_address), 'unknown') AS ip,
                COUNT(*)::bigint AS count,
                COALESCE(t.business_name, 'Admin') AS tenantName,
                COALESCE(us.country_name, 'Unknown') AS countryName,
                COALESCE(us.city, 'Unknown') AS city
            FROM user_sessions us
            LEFT JOIN tenant t ON t.id = us.tenant_id
            WHERE us.created_at >= :since
            GROUP BY COALESCE(HOST(us.ip_address), 'unknown'),
                     COALESCE(t.business_name, 'Admin'),
                     COALESCE(us.country_name, 'Unknown'),
                     COALESCE(us.city, 'Unknown')
            ORDER BY COUNT(*) DESC
            LIMIT 5
            """,
        nativeQuery = true
    )
    java.util.List<TopIpRowProjection> findTopIps(@Param("since") OffsetDateTime since);

    @Query(
        value = """
            SELECT
                COALESCE(us.country_code, 'UN') AS countryCode,
                COALESCE(us.country_name, 'Unknown') AS countryName,
                COUNT(*)::bigint AS count
            FROM user_sessions us
            WHERE us.created_at >= :since
            GROUP BY COALESCE(us.country_code, 'UN'), COALESCE(us.country_name, 'Unknown')
            ORDER BY COUNT(*) DESC
            """,
        nativeQuery = true
    )
    java.util.List<CountrySummaryRowProjection> findCountrySummary(@Param("since") OffsetDateTime since);

    @Query(
        value = """
            SELECT COUNT(*)
            FROM user_sessions us
            WHERE us.user_id = :userId
              AND us.ip_address = CAST(:ipAddress AS inet)
              AND us.created_at >= :since
            """,
        nativeQuery = true
    )
    long countKnownUserIp(@Param("userId") Long userId,
                          @Param("ipAddress") String ipAddress,
                          @Param("since") OffsetDateTime since);

    @Query(
        value = """
            SELECT COUNT(*)
            FROM user_sessions us
            WHERE us.ip_address = CAST(:ipAddress AS inet)
              AND us.created_at >= :since
            """,
        nativeQuery = true
    )
    long countRecentByIp(@Param("ipAddress") String ipAddress,
                         @Param("since") OffsetDateTime since);

        @Query("""
                SELECT COUNT(us)
                FROM UserSessionEntity us
                WHERE us.userId = :userId
                    AND us.createdAt >= :since
                """)
        long countUserSessionsSince(@Param("userId") Long userId,
                                                                @Param("since") OffsetDateTime since);

        @Query(
                value = """
                        SELECT us.country_code
                        FROM user_sessions us
                        WHERE us.user_id = :userId
                            AND us.created_at >= :since
                            AND us.country_code IS NOT NULL
                            AND us.country_code <> 'LOCAL'
                        GROUP BY us.country_code
                        ORDER BY COUNT(*) DESC
                        LIMIT 1
                        """,
                nativeQuery = true
        )
        String findMostFrequentCountrySince(@Param("userId") Long userId,
                                                                                @Param("since") OffsetDateTime since);

        @Query(
                value = """
                        SELECT us.country_code
                        FROM user_sessions us
                        WHERE us.user_id = :userId
                            AND us.created_at >= :since
                            AND us.country_code IS NOT NULL
                            AND us.country_code <> :countryCode
                        ORDER BY us.created_at DESC
                        LIMIT 1
                        """,
                nativeQuery = true
        )
        String findRecentDifferentCountry(@Param("userId") Long userId,
                                                                            @Param("since") OffsetDateTime since,
                                                                            @Param("countryCode") String countryCode);

        @Query(
                value = """
                        SELECT COUNT(*)
                        FROM user_sessions us
                        WHERE us.user_id = :userId
                            AND us.ua_browser = :uaBrowser
                            AND us.ua_os = :uaOs
                            AND us.created_at >= :since
                        """,
                nativeQuery = true
        )
        long countKnownUserAgent(@Param("userId") Long userId,
                                                         @Param("uaBrowser") String uaBrowser,
                                                         @Param("uaOs") String uaOs,
                                                         @Param("since") OffsetDateTime since);

        @Query(
                value = """
                        SELECT COUNT(*)
                        FROM user_sessions us
                        WHERE us.user_id = :userId
                            AND us.created_at >= :since
                            AND EXTRACT(HOUR FROM (us.created_at AT TIME ZONE 'Europe/Rome')) BETWEEN 0 AND 5
                        """,
                nativeQuery = true
        )
        long countNightSessionsSince(@Param("userId") Long userId,
                                                                 @Param("since") OffsetDateTime since);

    interface SessionRowProjection {
        Long getId();
        String getUserName();
        String getUserInitials();
        String getTenantName();
        Instant getCreatedAt();
        String getIpAddress();
        String getCountryCode();
        String getCountryName();
        String getCity();
        String getUaBrowser();
        String getUaOs();
        String getDeviceType();
        String getAnomaly();
    }

    interface HourlyRowProjection {
        Integer getHour();
        Long getCount();
        Long getAnomalyCount();
    }

    interface TopIpRowProjection {
        String getIp();
        Long getCount();
        String getTenantName();
        String getCountryName();
        String getCity();
    }

    interface CountrySummaryRowProjection {
        String getCountryCode();
        String getCountryName();
        Long getCount();
    }
}
