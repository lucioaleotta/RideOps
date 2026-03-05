package com.rideops.identity.adapters.out;

import org.springframework.data.jpa.repository.JpaRepository;

public interface EmailOutboxRepository extends JpaRepository<EmailOutboxEntity, Long> {
}
