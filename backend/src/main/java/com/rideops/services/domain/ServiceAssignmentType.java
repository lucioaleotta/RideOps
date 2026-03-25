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
    INCOMING
}
