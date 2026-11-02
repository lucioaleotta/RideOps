package com.rideops.absences.adapters.out;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.LocalDateTime;

@Entity
@Table(name = "regole_generali_assenza_tenant")
public class RegoleGeneraliAssenzaTenantEntity {

    @Id
    @Column(name = "tenant_id")
    private Long tenantId;

    @Column(name = "comportamento_conflitto_turni", nullable = false, length = 30)
    private String comportamentoConflittoTurni = "SEGNALA";

    @Column(name = "aggiornato_il", nullable = false)
    private LocalDateTime aggiornatoIl;

    @Column(name = "aggiornato_da")
    private Long aggiornatoDa;

    @PrePersist
    @PreUpdate
    void updateTimestamp() {
        aggiornatoIl = LocalDateTime.now();
    }

    public Long getTenantId() { return tenantId; }
    public void setTenantId(Long tenantId) { this.tenantId = tenantId; }
    public String getComportamentoConflittoTurni() { return comportamentoConflittoTurni; }
    public void setComportamentoConflittoTurni(String value) { this.comportamentoConflittoTurni = value; }
    public LocalDateTime getAggiornatoIl() { return aggiornatoIl; }
    public Long getAggiornatoDa() { return aggiornatoDa; }
    public void setAggiornatoDa(Long aggiornatoDa) { this.aggiornatoDa = aggiornatoDa; }
}