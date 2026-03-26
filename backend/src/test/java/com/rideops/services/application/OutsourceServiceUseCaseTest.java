package com.rideops.services.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.rideops.partners.adapters.out.PartnerEntity;
import com.rideops.partners.adapters.out.PartnerRepository;
import com.rideops.services.adapters.out.RideServiceEntity;
import com.rideops.services.domain.ServiceAssignmentType;
import com.rideops.services.domain.ServiceStatus;
import com.rideops.services.domain.ServiceType;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class OutsourceServiceUseCaseTest {

    @Mock
    private ServiceRepositoryPort serviceRepositoryPort;

    @Mock
    private PartnerRepository partnerRepository;

    private OutsourceServiceUseCase useCase;

    @BeforeEach
    void setUp() {
        useCase = new OutsourceServiceUseCase(serviceRepositoryPort, partnerRepository);
    }

    @Test
    void rejectOutsourceWhenServiceIncoming() {
        RideServiceEntity entity = sampleService();
        entity.setServiceAssignmentType(ServiceAssignmentType.INCOMING);

        when(serviceRepositoryPort.findById(10L)).thenReturn(Optional.of(entity));

        ServiceValidationException exception = assertThrows(
            ServiceValidationException.class,
            () -> useCase.execute(10L, 20L, new BigDecimal("50"))
        );

        assertEquals("Un servizio INCOMING non puo` essere affidato a partner", exception.getMessage());
        verify(serviceRepositoryPort, never()).save(entity);
    }

    @Test
    void rejectOutsourceWhenServiceClosed() {
        RideServiceEntity entity = sampleService();
        entity.setStatus(ServiceStatus.CLOSED);

        when(serviceRepositoryPort.findById(11L)).thenReturn(Optional.of(entity));

        ServiceValidationException exception = assertThrows(
            ServiceValidationException.class,
            () -> useCase.execute(11L, 20L, new BigDecimal("50"))
        );

        assertEquals("Un servizio ESEGUITO/CLOSED non puo` essere affidato a partner", exception.getMessage());
        verify(serviceRepositoryPort, never()).save(entity);
    }

    @Test
    void outsourceServiceAndCalculateMargin() {
        RideServiceEntity entity = sampleService();
        PartnerEntity partner = new PartnerEntity();
        partner.setDeleted(false);

        when(serviceRepositoryPort.findById(12L)).thenReturn(Optional.of(entity));
        when(partnerRepository.findById(20L)).thenReturn(Optional.of(partner));
        when(serviceRepositoryPort.save(entity)).thenReturn(entity);

        ServiceDto dto = useCase.execute(12L, 20L, new BigDecimal("95.00"));

        assertEquals(ServiceAssignmentType.OUTSOURCED, dto.serviceAssignmentType());
        assertEquals(20L, dto.partnerId());
        assertEquals(new BigDecimal("95.00"), dto.pricePartner());
        assertEquals(new BigDecimal("55.00"), dto.margin());
        verify(serviceRepositoryPort).save(entity);
    }

    private RideServiceEntity sampleService() {
        RideServiceEntity entity = new RideServiceEntity();
        entity.setStartAt(LocalDateTime.now().plusHours(2));
        entity.setPickupLocation("Roma");
        entity.setDestination("Milano");
        entity.setType(ServiceType.TRANSFER);
        entity.setStatus(ServiceStatus.OPEN);
        entity.setServiceAssignmentType(ServiceAssignmentType.INTERNAL);
        entity.setPrice(new BigDecimal("150.00"));
        return entity;
    }
}
