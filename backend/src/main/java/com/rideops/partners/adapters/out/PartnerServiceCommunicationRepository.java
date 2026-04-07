package com.rideops.partners.adapters.out;

import java.time.LocalDateTime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PartnerServiceCommunicationRepository extends JpaRepository<PartnerServiceCommunicationEntity, Long> {

  long countByPartnerIdAndServiceIdAndChannelAndTenantId(Long partnerId, Long serviceId, String channel, Long tenantId);

    @Query("""
        SELECT MAX(c.createdAt)
        FROM PartnerServiceCommunicationEntity c
        WHERE c.partnerId = :partnerId
          AND c.serviceId = :serviceId
          AND c.channel = :channel
      AND c.tenantId = :tenantId
        """)
    LocalDateTime findLastCommunicationAt(@Param("partnerId") Long partnerId,
                                          @Param("serviceId") Long serviceId,
                      @Param("channel") String channel,
                      @Param("tenantId") Long tenantId);

  java.util.List<PartnerServiceCommunicationEntity> findAllByServiceIdAndTenantIdOrderByCreatedAtDesc(Long serviceId,
                                                      Long tenantId);
}
