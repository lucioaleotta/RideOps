package com.rideops.absences.domain;

public enum StatoRichiestaAssenza {
    BOZZA,
    IN_ATTESA,
    APPROVATA,
    RIFIUTATA,
    ANNULLATA;

    public boolean isOccupante() {
        return this == IN_ATTESA || this == APPROVATA;
    }
}
