package com.rideops.absences.adapters.out;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AuditTipoAssenzaDefaultRepository extends JpaRepository<AuditTipoAssenzaDefaultEntity, Long> {

    List<AuditTipoAssenzaDefaultEntity> findTop50ByOrderByCreatoIlDesc();
}