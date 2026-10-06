package com.rideops.absences.adapters.out;

import com.rideops.absences.domain.OrigineRichiestaAssenza;
import com.rideops.absences.domain.StatoRichiestaAssenza;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import org.springframework.lang.NonNull;

@Entity
@Table(name = "richieste_assenza")
public class RichiestaAssenzaEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Column(name = "driver_id", nullable = false)
    private Long driverId;

    @Column(name = "tipo_assenza_id", nullable = false)
    private Long tipoAssenzaId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private OrigineRichiestaAssenza origine;

    @Column(name = "data_inizio", nullable = false)
    private LocalDate dataInizio;

    @Column(name = "data_fine", nullable = false)
    private LocalDate dataFine;

    @Column(name = "giornata_intera", nullable = false)
    private boolean giornataIntera = true;

    @Column(name = "ora_inizio")
    private LocalTime oraInizio;

    @Column(name = "ora_fine")
    private LocalTime oraFine;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private StatoRichiestaAssenza stato;

    @Column(name = "richiede_approvazione_eccezionale", nullable = false)
    private boolean richiedeApprovazioneEccezionale = false;

    @Column(columnDefinition = "TEXT")
    private String motivazione;

    @Column(name = "motivo_rifiuto", columnDefinition = "TEXT")
    private String motivoRifiuto;

    @Column(name = "documento_allegato_url", length = 500)
    private String documentoAllegatoUrl;

    @Column(name = "approvata_da")
    private Long approvataDa;

    @Column(name = "data_decisione")
    private LocalDateTime dataDecisione;

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
    void onUpdate() {
        aggiornatoIl = LocalDateTime.now();
    }

    public Long getId() {
        return id;
    }

    public Long getTenantId() {
        return tenantId;
    }

    public void setTenantId(Long tenantId) {
        this.tenantId = tenantId;
    }

    @NonNull
    public Long getDriverId() {
        return driverId;
    }

    public void setDriverId(Long driverId) {
        this.driverId = driverId;
    }

    @NonNull
    public Long getTipoAssenzaId() {
        return tipoAssenzaId;
    }

    public void setTipoAssenzaId(Long tipoAssenzaId) {
        this.tipoAssenzaId = tipoAssenzaId;
    }

    public OrigineRichiestaAssenza getOrigine() {
        return origine;
    }

    public void setOrigine(OrigineRichiestaAssenza origine) {
        this.origine = origine;
    }

    @NonNull
    public LocalDate getDataInizio() {
        return dataInizio;
    }

    public void setDataInizio(LocalDate dataInizio) {
        this.dataInizio = dataInizio;
    }

    @NonNull
    public LocalDate getDataFine() {
        return dataFine;
    }

    public void setDataFine(LocalDate dataFine) {
        this.dataFine = dataFine;
    }

    public boolean isGiornataIntera() {
        return giornataIntera;
    }

    public void setGiornataIntera(boolean giornataIntera) {
        this.giornataIntera = giornataIntera;
    }

    public LocalTime getOraInizio() {
        return oraInizio;
    }

    public void setOraInizio(LocalTime oraInizio) {
        this.oraInizio = oraInizio;
    }

    public LocalTime getOraFine() {
        return oraFine;
    }

    public void setOraFine(LocalTime oraFine) {
        this.oraFine = oraFine;
    }

    public StatoRichiestaAssenza getStato() {
        return stato;
    }

    public void setStato(StatoRichiestaAssenza stato) {
        this.stato = stato;
    }

    public boolean isRichiedeApprovazioneEccezionale() {
        return richiedeApprovazioneEccezionale;
    }

    public void setRichiedeApprovazioneEccezionale(boolean richiedeApprovazioneEccezionale) {
        this.richiedeApprovazioneEccezionale = richiedeApprovazioneEccezionale;
    }

    public String getMotivazione() {
        return motivazione;
    }

    public void setMotivazione(String motivazione) {
        this.motivazione = motivazione;
    }

    public String getMotivoRifiuto() {
        return motivoRifiuto;
    }

    public void setMotivoRifiuto(String motivoRifiuto) {
        this.motivoRifiuto = motivoRifiuto;
    }

    public String getDocumentoAllegatoUrl() {
        return documentoAllegatoUrl;
    }

    public void setDocumentoAllegatoUrl(String documentoAllegatoUrl) {
        this.documentoAllegatoUrl = documentoAllegatoUrl;
    }

    public Long getApprovataDa() {
        return approvataDa;
    }

    public void setApprovataDa(Long approvataDa) {
        this.approvataDa = approvataDa;
    }

    public LocalDateTime getDataDecisione() {
        return dataDecisione;
    }

    public void setDataDecisione(LocalDateTime dataDecisione) {
        this.dataDecisione = dataDecisione;
    }

    public LocalDateTime getCreatoIl() {
        return creatoIl;
    }

    public LocalDateTime getAggiornatoIl() {
        return aggiornatoIl;
    }
}
