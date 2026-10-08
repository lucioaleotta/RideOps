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
@Table(name = "configurazioni_assenza_tenant", uniqueConstraints =
    @UniqueConstraint(name = "uq_config_assenza_tenant_tipo", columnNames = {"tenant_id", "tipo_assenza_id"}))
public class ConfigurazioneAssenzaTenantEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

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

    @Column(name = "comportamento_maturato", nullable = false)
    private String comportamentoMaturato = "azzeramento_annuale";

    @Column(name = "scadenza_mesi_accumulo")
    private Integer scadenzaMesiAccumulo;

    @Column(name = "preavviso_minimo_giorni", nullable = false)
    private int preavvisoMinimoGiorni;

    @Column(name = "note_configurazione", columnDefinition = "TEXT")
    private String noteConfigurazione;

    @Column(name = "aggiornato_il", nullable = false)
    private LocalDateTime aggiornatoIl;

    @Column(name = "aggiornato_da")
    private Long aggiornatoDa;

    @PrePersist
    @PreUpdate
    void updateTimestamp() {
        aggiornatoIl = LocalDateTime.now();
    }

    public Long getId() { return id; }
    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public Long getTipoAssenzaId() { return tipoAssenzaId; }
    public void setTipoAssenzaId(Long tipoAssenzaId) { this.tipoAssenzaId = tipoAssenzaId; }
    public boolean isAbilitato() { return abilitato; }
    public void setAbilitato(boolean abilitato) { this.abilitato = abilitato; }
    public boolean isRichiedeDocumento() { return richiedeDocumento; }
    public void setRichiedeDocumento(boolean richiedeDocumento) { this.richiedeDocumento = richiedeDocumento; }
    public boolean isMonteOreAbilitato() { return monteOreAbilitato; }
    public void setMonteOreAbilitato(boolean monteOreAbilitato) { this.monteOreAbilitato = monteOreAbilitato; }
    public BigDecimal getNumeroGiorniAnnui() { return numeroGiorniAnnui; }
    public void setNumeroGiorniAnnui(BigDecimal value) { this.numeroGiorniAnnui = value; }
    public BigDecimal getNumeroGiorniMalattiaAnnui() { return numeroGiorniMalattiaAnnui; }
    public void setNumeroGiorniMalattiaAnnui(BigDecimal value) { this.numeroGiorniMalattiaAnnui = value; }
    public String getComportamentoMaturato() { return comportamentoMaturato; }
    public void setComportamentoMaturato(String comportamentoMaturato) { this.comportamentoMaturato = comportamentoMaturato; }
    public Integer getScadenzaMesiAccumulo() { return scadenzaMesiAccumulo; }
    public void setScadenzaMesiAccumulo(Integer scadenzaMesiAccumulo) { this.scadenzaMesiAccumulo = scadenzaMesiAccumulo; }
    public int getPreavvisoMinimoGiorni() { return preavvisoMinimoGiorni; }
    public void setPreavvisoMinimoGiorni(int preavvisoMinimoGiorni) { this.preavvisoMinimoGiorni = preavvisoMinimoGiorni; }
    public String getNoteConfigurazione() { return noteConfigurazione; }
    public void setNoteConfigurazione(String noteConfigurazione) { this.noteConfigurazione = noteConfigurazione; }
    public LocalDateTime getAggiornatoIl() { return aggiornatoIl; }
    public Long getAggiornatoDa() { return aggiornatoDa; }
    public void setAggiornatoDa(Long aggiornatoDa) { this.aggiornatoDa = aggiornatoDa; }
}