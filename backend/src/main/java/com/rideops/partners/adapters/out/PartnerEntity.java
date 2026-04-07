package com.rideops.partners.adapters.out;

import com.rideops.partners.domain.PartnerType;
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
import java.time.LocalDateTime;

@Entity
@Table(name = "partner")
public class PartnerEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tenant_id", nullable = false)
    private Long tenantId;

    @Enumerated(EnumType.STRING)
    @Column(name = "partner_type", nullable = false, length = 20)
    private PartnerType type;

    @Column(name = "ragione_sociale", nullable = false, length = 180)
    private String ragioneSociale;

    @Column(name = "nome_referente", length = 120)
    private String nomeReferente;

    @Column(name = "cognome_referente", length = 120)
    private String cognomeReferente;

    @Column(length = 40)
    private String telefono;

    @Column(length = 180)
    private String email;

    @Column(length = 120)
    private String citta;

    @Column(length = 240)
    private String indirizzo;

    @Column(name = "zona_operativa", length = 160)
    private String zonaOperativa;

    @Column(name = "partita_iva", length = 32)
    private String partitaIva;

    @Column(name = "codice_fiscale", length = 32)
    private String codiceFiscale;

    @Column(length = 64)
    private String iban;

    @Column(name = "intestatario_conto", length = 180)
    private String intestatarioConto;

    @Column(name = "note_pagamenti", columnDefinition = "TEXT")
    private String notePagamenti;

    @Column(name = "riceve_email", nullable = false)
    private boolean riceveEmail = true;

    @Column(name = "riceve_whatsapp", nullable = false)
    private boolean riceveWhatsApp = false;

    @Column(name = "telefono_whatsapp", length = 40)
    private String telefonoWhatsApp;

    @Column(name = "note_operative", columnDefinition = "TEXT")
    private String noteOperative;

    @Column(nullable = false)
    private boolean deleted = false;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (createdAt == null) {
            createdAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
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

    public PartnerType getType() {
        return type;
    }

    public void setType(PartnerType type) {
        this.type = type;
    }

    public String getRagioneSociale() {
        return ragioneSociale;
    }

    public void setRagioneSociale(String ragioneSociale) {
        this.ragioneSociale = ragioneSociale;
    }

    public String getNomeReferente() {
        return nomeReferente;
    }

    public void setNomeReferente(String nomeReferente) {
        this.nomeReferente = nomeReferente;
    }

    public String getCognomeReferente() {
        return cognomeReferente;
    }

    public void setCognomeReferente(String cognomeReferente) {
        this.cognomeReferente = cognomeReferente;
    }

    public String getTelefono() {
        return telefono;
    }

    public void setTelefono(String telefono) {
        this.telefono = telefono;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getCitta() {
        return citta;
    }

    public void setCitta(String citta) {
        this.citta = citta;
    }

    public String getIndirizzo() {
        return indirizzo;
    }

    public void setIndirizzo(String indirizzo) {
        this.indirizzo = indirizzo;
    }

    public String getZonaOperativa() {
        return zonaOperativa;
    }

    public void setZonaOperativa(String zonaOperativa) {
        this.zonaOperativa = zonaOperativa;
    }

    public String getPartitaIva() {
        return partitaIva;
    }

    public void setPartitaIva(String partitaIva) {
        this.partitaIva = partitaIva;
    }

    public String getCodiceFiscale() {
        return codiceFiscale;
    }

    public void setCodiceFiscale(String codiceFiscale) {
        this.codiceFiscale = codiceFiscale;
    }

    public String getIban() {
        return iban;
    }

    public void setIban(String iban) {
        this.iban = iban;
    }

    public String getIntestatarioConto() {
        return intestatarioConto;
    }

    public void setIntestatarioConto(String intestatarioConto) {
        this.intestatarioConto = intestatarioConto;
    }

    public String getNotePagamenti() {
        return notePagamenti;
    }

    public void setNotePagamenti(String notePagamenti) {
        this.notePagamenti = notePagamenti;
    }

    public boolean isRiceveEmail() {
        return riceveEmail;
    }

    public void setRiceveEmail(boolean riceveEmail) {
        this.riceveEmail = riceveEmail;
    }

    public boolean isRiceveWhatsApp() {
        return riceveWhatsApp;
    }

    public void setRiceveWhatsApp(boolean riceveWhatsApp) {
        this.riceveWhatsApp = riceveWhatsApp;
    }

    public String getTelefonoWhatsApp() {
        return telefonoWhatsApp;
    }

    public void setTelefonoWhatsApp(String telefonoWhatsApp) {
        this.telefonoWhatsApp = telefonoWhatsApp;
    }

    public String getNoteOperative() {
        return noteOperative;
    }

    public void setNoteOperative(String noteOperative) {
        this.noteOperative = noteOperative;
    }

    public boolean isDeleted() {
        return deleted;
    }

    public void setDeleted(boolean deleted) {
        this.deleted = deleted;
    }

    public LocalDateTime getDeletedAt() {
        return deletedAt;
    }

    public void setDeletedAt(LocalDateTime deletedAt) {
        this.deletedAt = deletedAt;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
}
