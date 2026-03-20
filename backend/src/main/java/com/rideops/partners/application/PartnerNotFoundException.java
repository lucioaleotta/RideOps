package com.rideops.partners.application;

public class PartnerNotFoundException extends RuntimeException {

    public PartnerNotFoundException(Long partnerId) {
        super("Partner non trovato: id=" + partnerId);
    }
}
