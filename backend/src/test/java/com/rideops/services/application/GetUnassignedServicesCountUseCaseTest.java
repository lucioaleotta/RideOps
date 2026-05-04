package com.rideops.services.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class GetUnassignedServicesCountUseCaseTest {

    @Mock
    private ServiceRepositoryPort serviceRepositoryPort;

    @Test
    void countUsesInternalOpenUnassignedRule() {
        when(serviceRepositoryPort.countUnassignedOpenInternalServices()).thenReturn(5L);

        GetUnassignedServicesCountUseCase useCase = new GetUnassignedServicesCountUseCase(serviceRepositoryPort);

        long result = useCase.execute();

        assertEquals(5L, result);
        verify(serviceRepositoryPort).countUnassignedOpenInternalServices();
    }
}
