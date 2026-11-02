package com.rideops.absences.application;

public record ConfigurazioneDriverAssenzaDto(
    Long driverId,
    String firstName,
    String lastName,
    boolean personalizzato,
    ConfigurazioneAssenzaDto configurazioneEffettiva
) {
}