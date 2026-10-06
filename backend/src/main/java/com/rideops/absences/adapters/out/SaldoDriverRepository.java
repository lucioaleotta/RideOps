package com.rideops.absences.adapters.out;

import java.util.List;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SaldoDriverRepository extends JpaRepository<SaldoDriverEntity, Long> {

    java.util.Optional<SaldoDriverEntity> findByTenantIdAndDriverIdAndTipoAssenzaIdAndAnnoMaturazione(
        Long tenantId, Long driverId, Long tipoAssenzaId, int annoMaturazione);

    @Modifying
    @Query(value = "INSERT INTO saldi_driver (tenant_id, driver_id, tipo_assenza_id, anno_maturazione, "
        + "quantita_maturata, quantita_utilizzata, aggiornato_il) "
        + "VALUES (:tenantId, :driverId, :tipoAssenzaId, :year, :amount, 0, CURRENT_TIMESTAMP) "
        + "ON CONFLICT (tenant_id, driver_id, tipo_assenza_id, anno_maturazione) DO NOTHING", nativeQuery = true)
    int insertCohortIfMissing(@Param("tenantId") Long tenantId,
                              @Param("driverId") Long driverId,
                              @Param("tipoAssenzaId") Long tipoAssenzaId,
                              @Param("year") int year,
                              @Param("amount") java.math.BigDecimal amount);

    List<SaldoDriverEntity> findAllByTenantIdAndDriverIdAndTipoAssenzaIdOrderByAnnoMaturazioneAsc(
        Long tenantId, Long driverId, Long tipoAssenzaId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select saldo from SaldoDriverEntity saldo where saldo.tenantId = :tenantId "
        + "and saldo.driverId = :driverId and saldo.tipoAssenzaId = :tipoAssenzaId "
        + "order by saldo.annoMaturazione asc")
    List<SaldoDriverEntity> findAllForUpdate(@Param("tenantId") Long tenantId,
                                             @Param("driverId") Long driverId,
                                             @Param("tipoAssenzaId") Long tipoAssenzaId);
}