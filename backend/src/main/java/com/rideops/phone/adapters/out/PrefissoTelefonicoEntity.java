package com.rideops.phone.adapters.out;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "prefissi_telefonici")
public class PrefissoTelefonicoEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "codice_iso2", nullable = false, length = 2)
    private String codiceIso2;

    @Column(name = "nome_paese", nullable = false, length = 100)
    private String nomePaese;

    @Column(name = "prefisso", nullable = false, length = 10)
    private String prefisso;

    @Column(name = "principale", nullable = false)
    private boolean principale;

    @Column(name = "attivo", nullable = false)
    private boolean attivo;

    @Column(name = "ordine", nullable = false)
    private int ordine;

    public Long getId() { return id; }
    public String getCodiceIso2() { return codiceIso2; }
    public String getNomePaese() { return nomePaese; }
    public String getPrefisso() { return prefisso; }
    public boolean isPrincipale() { return principale; }
    public boolean isAttivo() { return attivo; }
    public int getOrdine() { return ordine; }
}
