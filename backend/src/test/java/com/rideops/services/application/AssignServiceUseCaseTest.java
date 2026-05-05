package com.rideops.services.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.rideops.identity.application.admin.UserAdminRepositoryPort;
import com.rideops.services.adapters.out.RideServiceEntity;
import com.rideops.services.domain.ServiceAssignmentType;
import com.rideops.services.domain.ServiceStatus;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AssignServiceUseCaseTest {

    @Mock
    private ServiceRepositoryPort serviceRepositoryPort;

    @Mock
    private UserAdminRepositoryPort userAdminRepositoryPort;

    @Test
    void rejectDriverAssignmentWhenServiceIsOutsourced() {
        RideServiceEntity service = new RideServiceEntity();
        service.setStatus(ServiceStatus.OPEN);
        service.setServiceAssignmentType(ServiceAssignmentType.OUTSOURCED);

        when(serviceRepositoryPort.findById(10L)).thenReturn(Optional.of(service));

        AssignServiceUseCase useCase = new AssignServiceUseCase(serviceRepositoryPort, userAdminRepositoryPort);

        ServiceValidationException exception = assertThrows(
            ServiceValidationException.class,
            () -> useCase.execute(10L, 20L, 30L)
        );

        assertEquals(
            "Rimuovi prima l'assegnazione al partner OUTSOURCED prima di assegnare driver o veicolo",
            exception.getMessage()
        );
        verify(userAdminRepositoryPort, never()).findById(20L);
        verify(serviceRepositoryPort, never()).save(service);
    }
}