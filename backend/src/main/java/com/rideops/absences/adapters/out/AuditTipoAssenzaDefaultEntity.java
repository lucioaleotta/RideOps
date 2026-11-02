package com.rideops.absences.adapters.out;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "audit_tipi_assenza_default")
public class AuditTipoAssenzaDefaultEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "admin_user_id", nullable = false)
    private Long adminUserId;

    @Column(name = "admin_userid", nullable = false, length = 80)
    private String adminUserIdValue;

    @Column(name = "tipo_assenza_id")
    private Long tipoAssenzaId;

    @Column(nullable = false, length = 10)
    private String codice;

    @Column(nullable = false, length = 20)
    private String azione;

    @Column(name = "valori_precedenti", columnDefinition = "TEXT")
    private String valoriPrecedenti;

    @Column(name = "valori_nuovi", nullable = false, columnDefinition = "TEXT")
    private String valoriNuovi;

    @Column(name = "creato_il", nullable = false)
    private LocalDateTime creatoIl;

    @PrePersist
    void onCreate() {
        if (creatoIl == null) {
            creatoIl = LocalDateTime.now();
        }
    }

    public Long getId() { return id; }
    public Long getAdminUserId() { return adminUserId; }
    public void setAdminUserId(Long adminUserId) { this.adminUserId = adminUserId; }
    public String getAdminUserIdValue() { return adminUserIdValue; }
    public void setAdminUserIdValue(String adminUserIdValue) { this.adminUserIdValue = adminUserIdValue; }
    public Long getTipoAssenzaId() { return tipoAssenzaId; }
    public void setTipoAssenzaId(Long tipoAssenzaId) { this.tipoAssenzaId = tipoAssenzaId; }
    public String getCodice() { return codice; }
    public void setCodice(String codice) { this.codice = codice; }
    public String getAzione() { return azione; }
    public void setAzione(String azione) { this.azione = azione; }
    public String getValoriPrecedenti() { return valoriPrecedenti; }
    public void setValoriPrecedenti(String valoriPrecedenti) { this.valoriPrecedenti = valoriPrecedenti; }
    public String getValoriNuovi() { return valoriNuovi; }
    public void setValoriNuovi(String valoriNuovi) { this.valoriNuovi = valoriNuovi; }
    public LocalDateTime getCreatoIl() { return creatoIl; }
}