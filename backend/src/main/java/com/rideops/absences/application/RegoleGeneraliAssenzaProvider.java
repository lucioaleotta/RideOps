package com.rideops.absences.application;

/** Fornisce le regole generali effettive del tenant per la verifica dei conflitti. */
public interface RegoleGeneraliAssenzaProvider {

    RegoleGeneraliAssenzaDto getGeneralRules();
}
