package com.rideops.absences.adapters.out;

import com.rideops.absences.domain.UnitaMisuraAssenza;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "tipi_assenza")
public class TipoAssenzaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 10)
    private String codice;

    @Column(nullable = false, length = 100)
    private String nome;

    @Enumerated(EnumType.STRING)
    @Column(name = "unita_misura", nullable = false, length = 10)
    private UnitaMisuraAssenza unitaMisura;

    @Column(name = "origine_driver_consentita", nullable = false)
    private boolean origineDriverConsentita;

    @Column(name = "origine_gestionale_consentita", nullable = false)
    private boolean origineGestionaleConsentita;

    @Column(name = "richiede_orario", nullable = false)
    private boolean richiedeOrario;

    @Column(name = "richiede_documento_default", nullable = false)
    private boolean richiedeDocumentoDefault;

    @Column(name = "scala_da_monte_ore_default", nullable = false)
    private boolean scalaDaMonteOreDefault;

    @Column(name = "preavviso_minimo_giorni_default", nullable = false)
    private int preavvisoMinimoGiorniDefault;

    @Column(name = "numero_giorni_annui_default", precision = 8, scale = 2)
    private BigDecimal numeroGiorniAnnuiDefault;

    @Column(name = "numero_giorni_malattia_annui_default", precision = 8, scale = 2)
    private BigDecimal numeroGiorniMalattiaAnnuiDefault;

    @Column(name = "scadenza_mesi_accumulo_default")
    private Integer scadenzaMesiAccumuloDefault;

    @Column(nullable = false)
    private boolean attivo = true;

    public Long getId() {
        return id;
    }

    public String getCodice() {
        return codice;
    }

    public void setCodice(String codice) {
        this.codice = codice;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public UnitaMisuraAssenza getUnitaMisura() {
        return unitaMisura;
    }

    public void setUnitaMisura(UnitaMisuraAssenza unitaMisura) {
        this.unitaMisura = unitaMisura;
    }

    public boolean isOrigineDriverConsentita() {
        return origineDriverConsentita;
    }

    public void setOrigineDriverConsentita(boolean origineDriverConsentita) {
        this.origineDriverConsentita = origineDriverConsentita;
    }

    public boolean isOrigineGestionaleConsentita() {
        return origineGestionaleConsentita;
    }

    public void setOrigineGestionaleConsentita(boolean origineGestionaleConsentita) {
        this.origineGestionaleConsentita = origineGestionaleConsentita;
    }

    public boolean isRichiedeOrario() {
        return richiedeOrario;
    }

    public void setRichiedeOrario(boolean richiedeOrario) {
        this.richiedeOrario = richiedeOrario;
    }

    public boolean isRichiedeDocumentoDefault() {
        return richiedeDocumentoDefault;
    }

    public void setRichiedeDocumentoDefault(boolean richiedeDocumentoDefault) {
        this.richiedeDocumentoDefault = richiedeDocumentoDefault;
    }

    public boolean isScalaDaMonteOreDefault() {
        return scalaDaMonteOreDefault;
    }

    public void setScalaDaMonteOreDefault(boolean scalaDaMonteOreDefault) {
        this.scalaDaMonteOreDefault = scalaDaMonteOreDefault;
    }

    public int getPreavvisoMinimoGiorniDefault() {
        return preavvisoMinimoGiorniDefault;
    }

    public void setPreavvisoMinimoGiorniDefault(int preavvisoMinimoGiorniDefault) {
        this.preavvisoMinimoGiorniDefault = preavvisoMinimoGiorniDefault;
    }

    public BigDecimal getNumeroGiorniAnnuiDefault() {
        return numeroGiorniAnnuiDefault;
    }

    public void setNumeroGiorniAnnuiDefault(BigDecimal numeroGiorniAnnuiDefault) {
        this.numeroGiorniAnnuiDefault = numeroGiorniAnnuiDefault;
    }

    public BigDecimal getNumeroGiorniMalattiaAnnuiDefault() {
        return numeroGiorniMalattiaAnnuiDefault;
    }

    public void setNumeroGiorniMalattiaAnnuiDefault(BigDecimal numeroGiorniMalattiaAnnuiDefault) {
        this.numeroGiorniMalattiaAnnuiDefault = numeroGiorniMalattiaAnnuiDefault;
    }

    public Integer getScadenzaMesiAccumuloDefault() {
        return scadenzaMesiAccumuloDefault;
    }

    public void setScadenzaMesiAccumuloDefault(Integer scadenzaMesiAccumuloDefault) {
        this.scadenzaMesiAccumuloDefault = scadenzaMesiAccumuloDefault;
    }

    public boolean isAttivo() {
        return attivo;
    }

    public void setAttivo(boolean attivo) {
        this.attivo = attivo;
    }
}
