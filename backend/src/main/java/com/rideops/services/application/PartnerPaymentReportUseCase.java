package com.rideops.services.application;

import com.rideops.fleet.application.FleetService;
import com.rideops.fleet.application.VehicleDto;
import com.rideops.identity.application.admin.ListDriversUseCase;
import com.rideops.identity.application.admin.UserSummaryDto;
import com.rideops.services.domain.ServiceStatus;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

@Service
public class PartnerPaymentReportUseCase {

    private static final DateTimeFormatter FILENAME_MONTH = DateTimeFormatter.ofPattern("yyyy-MM");
    private static final DateTimeFormatter DATE_TIME_DISPLAY = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final String CSV_MEDIA_TYPE = "text/csv; charset=utf-8";
    private static final String XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private final ListServicesUseCase listServicesUseCase;
    private final ListDriversUseCase listDriversUseCase;
    private final FleetService fleetService;

    public PartnerPaymentReportUseCase(ListServicesUseCase listServicesUseCase,
                                       ListDriversUseCase listDriversUseCase,
                                       FleetService fleetService) {
        this.listServicesUseCase = listServicesUseCase;
        this.listDriversUseCase = listDriversUseCase;
        this.fleetService = fleetService;
    }

    public List<PartnerPaymentReportRowDto> list(LocalDate fromDate, LocalDate toDate, Long partnerId) {
        LocalDateTime from = fromDate.atStartOfDay();
        LocalDateTime to = toDate.plusDays(1).atStartOfDay();

        Map<Long, String> driverLabels = new HashMap<>();
        for (UserSummaryDto driver : listDriversUseCase.execute(true)) {
            driverLabels.put(driver.id(), driverLabel(driver));
        }

        Map<Long, String> vehiclePlates = new HashMap<>();
        for (VehicleDto vehicle : fleetService.listVehicles()) {
            vehiclePlates.put(vehicle.id(), vehicle.plate());
        }

        return listServicesUseCase.execute(from, to, null, null, null)
            .stream()
            .filter(service -> service.partnerId() != null)
            .filter(service -> service.status() != ServiceStatus.OPEN && service.status() != ServiceStatus.ASSIGNED)
            .filter(service -> partnerId == null || partnerId.equals(service.partnerId()))
            .map(service -> toRow(service, driverLabels, vehiclePlates))
            .sorted((left, right) -> {
                String leftPartner = left.partnerName() == null ? "" : left.partnerName();
                String rightPartner = right.partnerName() == null ? "" : right.partnerName();
                int byPartner = leftPartner.compareToIgnoreCase(rightPartner);
                if (byPartner != 0) {
                    return byPartner;
                }

                LocalDateTime leftDate = left.serviceDate() == null ? LocalDateTime.MIN : left.serviceDate();
                LocalDateTime rightDate = right.serviceDate() == null ? LocalDateTime.MIN : right.serviceDate();
                return leftDate.compareTo(rightDate);
            })
            .toList();
    }

    public ExportedFile export(LocalDate fromDate,
                               LocalDate toDate,
                               Long partnerId,
                               PartnerPaymentReportFormat format) {
        List<PartnerPaymentReportRowDto> rows = list(fromDate, toDate, partnerId);

        String suffix = partnerId == null ? "" : "_partner-" + partnerId;
        String filename = "report_pagamenti_partner_"
            + fromDate.format(FILENAME_MONTH)
            + "_"
            + toDate.format(FILENAME_MONTH)
            + suffix
            + (format == PartnerPaymentReportFormat.CSV ? ".csv" : ".xlsx");

        return switch (format) {
            case CSV -> new ExportedFile(toCsv(rows), CSV_MEDIA_TYPE, filename);
            case XLSX -> new ExportedFile(toXlsx(rows), XLSX_MEDIA_TYPE, filename);
        };
    }

    private PartnerPaymentReportRowDto toRow(ServiceDto service,
                                             Map<Long, String> driverLabels,
                                             Map<Long, String> vehiclePlates) {
        String partnerName = safe(service.partnerRagioneSociale());
        String rideCode = firstNonBlank(
            service.externalBookingReference(),
            service.internalBookingReference(),
            "RID-" + service.id()
        );

        BigDecimal amount = service.pricePartner() != null
            ? service.pricePartner()
            : (service.price() == null ? BigDecimal.ZERO : service.price());

        String driverName = service.assignedDriverId() == null
            ? "-"
            : safe(driverLabels.get(service.assignedDriverId()));

        String vehiclePlate = service.assignedVehicleId() == null
            ? "-"
            : safe(vehiclePlates.get(service.assignedVehicleId()));

        String serviceType = service.type() == null ? "-" : safe(service.type().name());
        String pickup = safe(service.pickupLocation());
        String destination = safe(service.destination());

        return new PartnerPaymentReportRowDto(
            service.partnerId(),
            partnerName,
            service.id(),
            rideCode,
            service.startAt(),
            amount,
            driverName,
            vehiclePlate,
            serviceType,
            pickup,
            destination,
            pickup + " -> " + destination
        );
    }

    private byte[] toCsv(List<PartnerPaymentReportRowDto> rows) {
        String header = String.join(";",
            "Partner",
            "ID corsa",
            "Data servizio",
            "Importo EUR",
            "Driver",
            "Targa",
            "Tipologia",
            "Pickup",
            "Destinazione",
            "Tratta"
        );

        List<String> lines = rows.stream()
            .map(row -> String.join(";",
                escapeCsv(row.partnerName()),
                escapeCsv(row.rideCode()),
                escapeCsv(formatDate(row.serviceDate())),
                escapeCsv(row.amount().setScale(2, java.math.RoundingMode.HALF_UP).toPlainString().replace('.', ',')),
                escapeCsv(row.driverName()),
                escapeCsv(row.vehiclePlate()),
                escapeCsv(row.serviceType()),
                escapeCsv(row.pickupLocation()),
                escapeCsv(row.destination()),
                escapeCsv(row.route())
            ))
            .toList();

        String content = "\uFEFF" + header + "\n" + String.join("\n", lines);
        return content.getBytes(StandardCharsets.UTF_8);
    }

    private byte[] toXlsx(List<PartnerPaymentReportRowDto> rows) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Report Partner");

            CellStyle headerStyle = workbook.createCellStyle();
            var headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor((short) 22);
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);

            CellStyle currencyStyle = workbook.createCellStyle();
            currencyStyle.setDataFormat(workbook.createDataFormat().getFormat("[$EUR ]#,##0.00"));

            String[] labels = {
                "Partner",
                "ID corsa",
                "Data servizio",
                "Importo EUR",
                "Driver",
                "Targa",
                "Tipologia",
                "Pickup",
                "Destinazione",
                "Tratta"
            };

            Row header = sheet.createRow(0);
            for (int index = 0; index < labels.length; index++) {
                var cell = header.createCell(index);
                cell.setCellValue(labels[index]);
                cell.setCellStyle(headerStyle);
            }

            int rowIndex = 1;
            for (PartnerPaymentReportRowDto row : rows) {
                Row sheetRow = sheet.createRow(rowIndex++);
                sheetRow.createCell(0).setCellValue(row.partnerName());
                sheetRow.createCell(1).setCellValue(row.rideCode());
                sheetRow.createCell(2).setCellValue(formatDate(row.serviceDate()));
                var amountCell = sheetRow.createCell(3);
                amountCell.setCellValue(row.amount().doubleValue());
                amountCell.setCellStyle(currencyStyle);
                sheetRow.createCell(4).setCellValue(row.driverName());
                sheetRow.createCell(5).setCellValue(row.vehiclePlate());
                sheetRow.createCell(6).setCellValue(row.serviceType());
                sheetRow.createCell(7).setCellValue(row.pickupLocation());
                sheetRow.createCell(8).setCellValue(row.destination());
                sheetRow.createCell(9).setCellValue(row.route());
            }

            for (int index = 0; index < labels.length; index++) {
                sheet.autoSizeColumn(index);
                sheet.setColumnWidth(index, Math.min(sheet.getColumnWidth(index) + 900, 22000));
            }

            workbook.write(output);
            return output.toByteArray();
        } catch (IOException exception) {
            throw new ServiceExportGenerationException("Impossibile generare il file Excel del report partner", exception);
        }
    }

    private String formatDate(LocalDateTime value) {
        if (value == null) {
            return "-";
        }
        return value.format(DATE_TIME_DISPLAY);
    }

    private String driverLabel(UserSummaryDto driver) {
        String fullName = (safe(driver.firstName()) + " " + safe(driver.lastName())).trim();
        if (!fullName.isBlank() && !"- -".equals(fullName)) {
            return fullName;
        }
        return safe(driver.email());
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "-" : value.trim();
    }

    private String firstNonBlank(String first, String second, String fallback) {
        if (first != null && !first.isBlank()) {
            return first.trim();
        }
        if (second != null && !second.isBlank()) {
            return second.trim();
        }
        return fallback;
    }

    private String escapeCsv(String value) {
        if (value.contains(";") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    public enum PartnerPaymentReportFormat {
        CSV,
        XLSX;

        public static PartnerPaymentReportFormat parse(String rawValue) {
            return PartnerPaymentReportFormat.valueOf(rawValue.trim().toUpperCase(Locale.ROOT));
        }
    }

    public record ExportedFile(byte[] content, String contentType, String filename) {
    }
}
