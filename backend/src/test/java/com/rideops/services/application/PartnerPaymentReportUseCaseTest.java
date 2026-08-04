package com.rideops.services.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;

import com.rideops.fleet.application.FleetService;
import com.rideops.fleet.application.VehicleDto;
import com.rideops.fleet.domain.VehicleType;
import com.rideops.identity.application.admin.ListDriversUseCase;
import com.rideops.identity.application.admin.UserSummaryDto;
import com.rideops.services.domain.ServiceAssignmentType;
import com.rideops.services.domain.ServiceStatus;
import com.rideops.services.domain.ServiceType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class PartnerPaymentReportUseCaseTest {

    @Mock
    private ListServicesUseCase listServicesUseCase;

    @Mock
    private ListDriversUseCase listDriversUseCase;

    @Mock
    private FleetService fleetService;

    @Test
    void listExcludesOpenAndAssignedAndAppliesPartnerFilter() {
        LocalDateTime when = LocalDateTime.of(2026, 6, 10, 9, 0);

        when(listServicesUseCase.execute(
            LocalDate.of(2026, 6, 1).atStartOfDay(),
            LocalDate.of(2026, 6, 30).plusDays(1).atStartOfDay(),
            null,
            null,
            null
        )).thenReturn(List.of(
            service(1L, ServiceStatus.OPEN, 10L, "Alfa", when, new BigDecimal("80.00"), "EXT-1"),
            service(2L, ServiceStatus.ASSIGNED, 10L, "Alfa", when.plusDays(1), new BigDecimal("90.00"), "EXT-2"),
            service(3L, ServiceStatus.EXECUTED, 10L, "Alfa", when.plusDays(2), new BigDecimal("120.00"), "EXT-3"),
            service(4L, ServiceStatus.CLOSED, 20L, "Beta", when.plusDays(3), new BigDecimal("140.00"), "EXT-4"),
            service(5L, ServiceStatus.EXECUTED, null, null, when.plusDays(4), new BigDecimal("70.00"), "EXT-5")
        ));

        when(listDriversUseCase.execute(true)).thenReturn(List.of(
            new UserSummaryDto(7L, "driver7", "driver7@test.local", "DRIVER", true, LocalDateTime.now(), "Mario", "Rossi", null, null, List.of(), List.of(), null, null, null, null)
        ));

        when(fleetService.listVehicles()).thenReturn(List.of(
            new VehicleDto(3L, "AB123CD", 4, VehicleType.SEDAN, null, LocalDateTime.now(), LocalDateTime.now())
        ));

        PartnerPaymentReportUseCase useCase = new PartnerPaymentReportUseCase(listServicesUseCase, listDriversUseCase, fleetService);

        List<PartnerPaymentReportRowDto> rows = useCase.list(
            LocalDate.of(2026, 6, 1),
            LocalDate.of(2026, 6, 30),
            10L
        );

        assertEquals(1, rows.size());
        PartnerPaymentReportRowDto row = rows.get(0);
        assertEquals(3L, row.serviceId());
        assertEquals("Alfa", row.partnerName());
        assertEquals("EXT-3", row.rideCode());
        assertEquals(new BigDecimal("120.00"), row.amount());
        assertEquals("Mario Rossi", row.driverName());
        assertEquals("AB123CD", row.vehiclePlate());
        assertEquals("Via Roma -> Aeroporto", row.route());
    }

    @Test
    void exportCsvRespectsFiltersAndBuildsFilename() {
        LocalDate from = LocalDate.of(2026, 1, 1);
        LocalDate to = LocalDate.of(2026, 3, 31);

        when(listServicesUseCase.execute(from.atStartOfDay(), to.plusDays(1).atStartOfDay(), null, null, null))
            .thenReturn(List.of(
                service(10L, ServiceStatus.EXECUTED, 44L, "Partner Uno", LocalDateTime.of(2026, 2, 15, 11, 30), new BigDecimal("230.50"), "REF-44")
            ));

        when(listDriversUseCase.execute(true)).thenReturn(List.of());
        when(fleetService.listVehicles()).thenReturn(List.of());

        PartnerPaymentReportUseCase useCase = new PartnerPaymentReportUseCase(listServicesUseCase, listDriversUseCase, fleetService);

        PartnerPaymentReportUseCase.ExportedFile exported = useCase.export(
            from,
            to,
            44L,
            PartnerPaymentReportUseCase.PartnerPaymentReportFormat.CSV
        );

        String csv = new String(exported.content());
        assertEquals("text/csv; charset=utf-8", exported.contentType());
        assertTrue(exported.filename().contains("report_pagamenti_partner_2026-01_2026-03_partner-44.csv"));
        assertTrue(csv.contains("Partner Uno"));
        assertTrue(csv.contains("REF-44"));
    }

    private ServiceDto service(Long id,
                               ServiceStatus status,
                               Long partnerId,
                               String partnerName,
                               LocalDateTime startAt,
                               BigDecimal pricePartner,
                               String externalReference) {
        return new ServiceDto(
            id,
            startAt,
            "Via Roma",
            "Aeroporto",
            ServiceType.TRANSFER,
            null,
            null,
            new BigDecimal("300.00"),
            externalReference,
            "INT-" + id,
            null,
            null,
            null,
            null,
            null,
            status,
            7L,
            3L,
            null,
            null,
            ServiceAssignmentType.INTERNAL,
            partnerId,
            partnerName,
            pricePartner,
            null,
            null,
            null,
            LocalDateTime.now(),
            LocalDateTime.now()
        );
    }
}
