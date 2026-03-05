package com.rideops.services.domain;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

import org.junit.jupiter.api.Test;

class RideServiceTest {

    @Test
    void openCanBeAssigned() {
        RideService service = new RideService(ServiceStatus.OPEN);

        service.assign();

        assertEquals(ServiceStatus.ASSIGNED, service.getStatus());
    }

    @Test
    void openCannotBeClosedDirectly() {
        RideService service = new RideService(ServiceStatus.OPEN);

        assertThrows(ServiceDomainException.class, service::close);
    }

    @Test
    void assignedCanBeClosed() {
        RideService service = new RideService(ServiceStatus.ASSIGNED);

        service.close();

        assertEquals(ServiceStatus.CLOSED, service.getStatus());
    }

    @Test
    void closedCannotTransition() {
        RideService service = new RideService(ServiceStatus.CLOSED);

        assertThrows(ServiceDomainException.class, service::assign);
    }
}