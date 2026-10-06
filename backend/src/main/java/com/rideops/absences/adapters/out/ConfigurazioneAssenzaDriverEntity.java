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
@Table(name = "configurazioni_assenza_driver", uniqueConstraints =
    @UniqueConstraint(name = "uq_config_assenza_driver_tipo", columnNames = {"driver_id", "tipo_assenza_id"}))
public class ConfigurazioneAssenzaDriverEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "driver_id", nullable = false)
    private Long driverId;

    @Column(name = "tipo_assenza_id", nullable = false)
    private Long tipoAssenzaId;

    @Column(nullable = false)
    private boolean abilitato;

    @Column(name = "richiede_documento", nullable = false)
    private boolean richiedeDocumento;

    @Column(name = "monte_ore_abilitato", nullable = false)
    private boolean monteOreAbilitato;

    @Column(name = "numero_giorni_annui", precision = 8, scale = 2)
    private BigDecimal numeroGiorniAnnui;

    @Column(name = "numero_giorni_malattia_annui", precision = 8, scale = 2)
    private BigDecimal numeroGiorniMalattiaAnnui;

    @Column(name = "scadenza_ferie_mesi")
    private Integer scadenzaFerieMesi;

    @Column(name = "preavviso_minimo_giorni", nullable = false)
    private int preavvisoMinimoGiorni;

    @Column(columnDefinition = "TEXT")
    private String motivo;

    @Column(name = "creato_da")
    private Long creatoDa;

    @Column(name = "creato_il", nullable = false)
    private LocalDateTime creatoIl;

    @Column(name = "aggiornato_il", nullable = false)
    private LocalDateTime aggiornatoIl;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (creatoIl == null) {
            creatoIl = now;
        }
        aggiornatoIl = now;
    }

    @PreUpdate
    void onUpdate() { aggiornatoIl = LocalDateTime.now(); }

    public Long getId() { return id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Long getDriverId() { return driverId; }
    public void setDriverId(Long driverId) { this.driverId = driverId; }
    public Long getTipoAssenzaId() { return tipoAssenzaId; }
    public void setTipoAssenzaId(Long tipoAssenzaId) { this.tipoAssenzaId = tipoAssenzaId; }
    public boolean isAbilitato() { return abilitato; }
    public void setAbilitato(boolean value) { this.abilitato = value; }
    public boolean isRichiedeDocumento() { return richiedeDocumento; }
    public void setRichiedeDocumento(boolean value) { this.richiedeDocumento = value; }
    public boolean isMonteOreAbilitato() { return monteOreAbilitato; }
    public void setMonteOreAbilitato(boolean value) { this.monteOreAbilitato = value; }
    public BigDecimal getNumeroGiorniAnnui() { return numeroGiorniAnnui; }
    public void setNumeroGiorniAnnui(BigDecimal value) { this.numeroGiorniAnnui = value; }
    public BigDecimal getNumeroGiorniMalattiaAnnui() { return numeroGiorniMalattiaAnnui; }
    public void setNumeroGiorniMalattiaAnnui(BigDecimal value) { this.numeroGiorniMalattiaAnnui = value; }
    public Integer getScadenzaFerieMesi() { return scadenzaFerieMesi; }
    public void setScadenzaFerieMesi(Integer value) { this.scadenzaFerieMesi = value; }
    public int getPreavvisoMinimoGiorni() { return preavvisoMinimoGiorni; }
    public void setPreavvisoMinimoGiorni(int value) { this.preavvisoMinimoGiorni = value; }
    public String getMotivo() { return motivo; }
    public void setMotivo(String motivo) { this.motivo = motivo; }
    public Long getCreatoDa() { return creatoDa; }
    public void setCreatoDa(Long creatoDa) { this.creatoDa = creatoDa; }
    public LocalDateTime getCreatoIl() { return creatoIl; }
    public LocalDateTime getAggiornatoIl() { return aggiornatoIl; }
}