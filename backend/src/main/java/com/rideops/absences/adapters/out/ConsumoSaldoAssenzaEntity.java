package com.rideops.absences.adapters.out;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "consumi_saldo_assenza")
public class ConsumoSaldoAssenzaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "richiesta_assenza_id", nullable = false)
    private Long richiestaAssenzaId;

    @Column(name = "saldo_driver_id", nullable = false)
    private Long saldoDriverId;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal quantita;

    @Column(nullable = false)
    private boolean stornato;

    @Column(name = "creato_il", nullable = false)
    private LocalDateTime creatoIl;

    @PrePersist
    void onCreate() { if (creatoIl == null) creatoIl = LocalDateTime.now(); }

    public Long getId() { return id; }
    public Long getRichiestaAssenzaId() { return richiestaAssenzaId; }
    public void setRichiestaAssenzaId(Long richiestaAssenzaId) { this.richiestaAssenzaId = richiestaAssenzaId; }
    public Long getSaldoDriverId() { return saldoDriverId; }
    public void setSaldoDriverId(Long saldoDriverId) { this.saldoDriverId = saldoDriverId; }
    public BigDecimal getQuantita() { return quantita; }
    public void setQuantita(BigDecimal quantita) { this.quantita = quantita; }
    public boolean isStornato() { return stornato; }
    public void setStornato(boolean stornato) { this.stornato = stornato; }
    public LocalDateTime getCreatoIl() { return creatoIl; }
}