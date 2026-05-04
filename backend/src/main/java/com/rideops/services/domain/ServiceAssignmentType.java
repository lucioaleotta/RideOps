package com.rideops.services.domain;

/**
 * Specifies how a service is assigned/managed.
 * 
 * INTERNAL: Service managed internally
 * OUTSOURCED: Service assigned to an external partner
 * INCOMING: Service received from an external partner
 */
public enum ServiceAssignmentType {
    INTERNAL,
    OUTSOURCED,
    INCOMING,
    /**
     * Servizio ricevuto da un partner (Agenzia A) e successivamente affidato
     * in esecuzione a un'altra NCC (partner esecutore).
     */
    INCOMING_OUTSOURCED
}
