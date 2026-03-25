package com.rideops.partners.adapters.out;

import java.time.LocalDateTime;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PartnerServiceCommunicationRepository extends JpaRepository<PartnerServiceCommunicationEntity, Long> {

    long countByPartnerIdAndServiceIdAndChannel(Long partnerId, Long serviceId, String channel);

    @Query("""
        SELECT MAX(c.createdAt)
        FROM PartnerServiceCommunicationEntity c
        WHERE c.partnerId = :partnerId
          AND c.serviceId = :serviceId
          AND c.channel = :channel
        """)
    LocalDateTime findLastCommunicationAt(@Param("partnerId") Long partnerId,
                                          @Param("serviceId") Long serviceId,
                                          @Param("channel") String channel);

    java.util.List<PartnerServiceCommunicationEntity> findAllByServiceIdOrderByCreatedAtDesc(Long serviceId);
}
