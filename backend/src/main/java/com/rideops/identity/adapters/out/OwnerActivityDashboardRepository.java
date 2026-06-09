package com.rideops.identity.adapters.out;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface OwnerActivityDashboardRepository extends JpaRepository<UserSessionEntity, Long> {

    @Query(
        value = """
            SELECT COUNT(*)
            FROM ride_service r
            WHERE r.created_at >= :since
            """,
        nativeQuery = true
    )
    long countServicesSince(@Param("since") OffsetDateTime since);

    @Query(
        value = """
            SELECT COUNT(DISTINCT r.tenant_id)
            FROM ride_service r
            WHERE r.created_at >= :since
            """,
        nativeQuery = true
    )
    long countActiveClientsSince(@Param("since") OffsetDateTime since);

    @Query(value = "SELECT COUNT(*) FROM tenant", nativeQuery = true)
    long countTotalClients();

    @Query(
        value = """
            WITH top_tenants AS (
              SELECT
                r.tenant_id,
                COUNT(*) AS total_services,
                ROW_NUMBER() OVER (ORDER BY COUNT(*) DESC, r.tenant_id ASC) AS rank
              FROM ride_service r
              WHERE r.created_at >= :since
              GROUP BY r.tenant_id
              ORDER BY total_services DESC, r.tenant_id ASC
              LIMIT 5
            )
            SELECT
              r.tenant_id AS tenantId,
              t.business_name AS tenantName,
              tt.rank AS rank,
              DATE_TRUNC('month', r.created_at)::date AS monthDate,
              COUNT(*)::bigint AS services
            FROM ride_service r
            JOIN top_tenants tt ON tt.tenant_id = r.tenant_id
            JOIN tenant t ON t.id = r.tenant_id
            WHERE r.created_at >= :since
            GROUP BY r.tenant_id, t.business_name, tt.rank, DATE_TRUNC('month', r.created_at)
            ORDER BY tt.rank ASC, monthDate ASC
            """,
        nativeQuery = true
    )
    List<MonthlyTenantServicesProjection> findMonthlyServicesForTopTenantsSince(@Param("since") OffsetDateTime since);

    @Query(
        value = """
            WITH service_counts AS (
              SELECT r.tenant_id, COUNT(*) AS total_services
              FROM ride_service r
              WHERE r.created_at >= :since
              GROUP BY r.tenant_id
            ),
            session_counts AS (
              SELECT us.tenant_id, COUNT(*) AS total_sessions
              FROM user_sessions us
              WHERE us.created_at >= :since
              GROUP BY us.tenant_id
            )
            SELECT
              t.id AS tenantId,
              t.business_name AS tenantName,
              COALESCE(sc.total_services, 0)::bigint AS totalServices,
              COALESCE(ss.total_sessions, 0)::bigint AS totalSessions,
              ROUND(
                COALESCE(sc.total_services, 0) * 0.7
                + (COALESCE(ss.total_sessions, 0)::float / NULLIF(:weeks, 0)) * 30
              )::int AS score
            FROM tenant t
            LEFT JOIN service_counts sc ON sc.tenant_id = t.id
            LEFT JOIN session_counts ss ON ss.tenant_id = t.id
            ORDER BY score DESC, t.business_name ASC
            LIMIT 5
            """,
        nativeQuery = true
    )
    List<Top5TenantProjection> findTop5ByScoreSince(@Param("since") OffsetDateTime since,
                                                    @Param("weeks") double weeks);

    @Query(
        value = """
            WITH first_half AS (
              SELECT r.tenant_id, COUNT(*) AS services
              FROM ride_service r
              WHERE r.created_at >= :since
                AND r.created_at < :midpoint
              GROUP BY r.tenant_id
            ),
            second_half AS (
              SELECT r.tenant_id, COUNT(*) AS services
              FROM ride_service r
              WHERE r.created_at >= :midpoint
              GROUP BY r.tenant_id
            ),
            sessions_agg AS (
              SELECT us.tenant_id, COUNT(*) AS total_sessions
              FROM user_sessions us
              WHERE us.created_at >= :since
              GROUP BY us.tenant_id
            )
            SELECT
              t.id AS tenantId,
              t.business_name AS tenantName,
              t.subscription_plan AS plan,
              CASE t.subscription_plan
                WHEN 'STARTER' THEN 120
                WHEN 'PRO' THEN 500
                WHEN 'ENTERPRISE' THEN 2000
                ELSE 0
              END AS planLimit,
              (COALESCE(fh.services, 0) + COALESCE(sh.services, 0))::bigint AS totalServices,
              ROUND(
                COALESCE(sa.total_sessions, 0)::numeric
                / NULLIF(CAST(:weeks AS numeric), 0),
                1
              )::double precision AS avgLoginsPerWeek,
              LEAST(
                ROUND(
                  (COALESCE(fh.services, 0) + COALESCE(sh.services, 0))::float
                  / NULLIF(
                    CASE t.subscription_plan
                      WHEN 'STARTER' THEN 120
                      WHEN 'PRO' THEN 500
                      WHEN 'ENTERPRISE' THEN 2000
                      ELSE 0
                    END,
                    0
                  ) * 100
                ),
                100
              )::int AS limitPct,
              CASE
                WHEN COALESCE(fh.services, 0) = 0 AND COALESCE(sh.services, 0) > 0 THEN 100
                WHEN COALESCE(fh.services, 0) = 0 THEN 0
                ELSE ROUND(
                  (COALESCE(sh.services, 0) - COALESCE(fh.services, 0))::float
                  / COALESCE(fh.services, 0) * 100
                )
              END::int AS trendPct
            FROM tenant t
            LEFT JOIN first_half fh ON fh.tenant_id = t.id
            LEFT JOIN second_half sh ON sh.tenant_id = t.id
            LEFT JOIN sessions_agg sa ON sa.tenant_id = t.id
            ORDER BY totalServices DESC, t.business_name ASC
            LIMIT :limit OFFSET :offset
            """,
        nativeQuery = true
    )
    List<ClientMetricsProjection> findClientsMetrics(@Param("since") OffsetDateTime since,
                                                     @Param("midpoint") OffsetDateTime midpoint,
                                                     @Param("weeks") double weeks,
                                                     @Param("limit") int limit,
                                                     @Param("offset") int offset);

    interface MonthlyTenantServicesProjection {
        Long getTenantId();
        String getTenantName();
        Integer getRank();
        LocalDate getMonthDate();
        Long getServices();
    }

    interface Top5TenantProjection {
        Long getTenantId();
        String getTenantName();
        Long getTotalServices();
        Long getTotalSessions();
        Integer getScore();
    }

    interface ClientMetricsProjection {
        Long getTenantId();
        String getTenantName();
        String getPlan();
        Integer getPlanLimit();
        Long getTotalServices();
        Double getAvgLoginsPerWeek();
        Integer getLimitPct();
        Integer getTrendPct();
    }
}
