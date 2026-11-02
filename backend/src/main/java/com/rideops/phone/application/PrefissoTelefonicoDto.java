package com.rideops.phone.application;

public record PrefissoTelefonicoDto(
    String codiceIso2,
    String nomePaese,
    String prefisso,
    boolean principale
) {
}
