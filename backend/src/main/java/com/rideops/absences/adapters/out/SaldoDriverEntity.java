package com.rideops.absences.adapters.out;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "saldi_driver", uniqueConstraints = @UniqueConstraint(
    name = "uq_saldi_driver_tipo_anno", columnNames = {"tenant_id", "driver_id", "tipo_assenza_id", "anno_maturazione"}))
public class SaldoDriverEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "driver_id", nullable = false)
    private Long driverId;

    @Column(name = "tipo_assenza_id", nullable = false)
    private Long tipoAssenzaId;

    @Column(name = "anno_maturazione", nullable = false)
    private int annoMaturazione;

    @Column(name = "quantita_maturata", nullable = false, precision = 10, scale = 2)
    private BigDecimal quantitaMaturata;

    @Column(name = "quantita_utilizzata", nullable = false, precision = 10, scale = 2)
    private BigDecimal quantitaUtilizzata = BigDecimal.ZERO;

    @Column(name = "aggiornato_il", nullable = false)
    private LocalDateTime aggiornatoIl;

    @Column(name = "aggiornato_da")
    private Long aggiornatoDa;

    @PrePersist
    @PreUpdate
    void updateTimestamp() { aggiornatoIl = LocalDateTime.now(); }

    public Long getId() { return id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Long getDriverId() { return driverId; }
    public void setDriverId(Long driverId) { this.driverId = driverId; }
    public Long getTipoAssenzaId() { return tipoAssenzaId; }
    public void setTipoAssenzaId(Long tipoAssenzaId) { this.tipoAssenzaId = tipoAssenzaId; }
    public int getAnnoMaturazione() { return annoMaturazione; }
    public void setAnnoMaturazione(int annoMaturazione) { this.annoMaturazione = annoMaturazione; }
    public BigDecimal getQuantitaMaturata() { return quantitaMaturata; }
    public void setQuantitaMaturata(BigDecimal quantitaMaturata) { this.quantitaMaturata = quantitaMaturata; }
    public BigDecimal getQuantitaUtilizzata() { return quantitaUtilizzata; }
    public void setQuantitaUtilizzata(BigDecimal quantitaUtilizzata) { this.quantitaUtilizzata = quantitaUtilizzata; }
    public LocalDateTime getAggiornatoIl() { return aggiornatoIl; }
    public Long getAggiornatoDa() { return aggiornatoDa; }
    public void setAggiornatoDa(Long aggiornatoDa) { this.aggiornatoDa = aggiornatoDa; }
}