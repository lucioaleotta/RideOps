package com.rideops.services.application;

import com.rideops.fleet.application.FleetService;
import com.rideops.fleet.application.VehicleDto;
import com.rideops.identity.application.admin.ListDriversUseCase;
import com.rideops.identity.application.admin.UserSummaryDto;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

@Service
public class ServiceExportUseCase {

    private static final DateTimeFormatter CSV_FILENAME_MONTH = DateTimeFormatter.ofPattern("yyyy-MM");
    private static final DateTimeFormatter DATE_TIME_DISPLAY = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final String CSV_MEDIA_TYPE = "text/csv; charset=utf-8";
    private static final String XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private final ListServicesUseCase listServicesUseCase;
    private final ListDriversUseCase listDriversUseCase;
    private final FleetService fleetService;

    public ServiceExportUseCase(ListServicesUseCase listServicesUseCase,
                                ListDriversUseCase listDriversUseCase,
                                FleetService fleetService) {
        this.listServicesUseCase = listServicesUseCase;
        this.listDriversUseCase = listDriversUseCase;
        this.fleetService = fleetService;
    }

    public ExportedFile export(LocalDate fromDate, LocalDate toDate, ServiceExportFormat format) {
        LocalDateTime from = fromDate.atStartOfDay();
        LocalDateTime to = toDate.plusDays(1).atStartOfDay();

        List<ServiceDto> services = listServicesUseCase.execute(from, to, null, null, null);
        Map<Long, String> driverLabels = listDriversUseCase.execute(false).stream()
            .collect(Collectors.toMap(UserSummaryDto::id, this::driverLabel));
        Map<Long, String> vehiclePlates = fleetService.listVehicles().stream()
            .collect(Collectors.toMap(VehicleDto::id, VehicleDto::plate));

        List<ServiceExportRow> rows = services.stream()
            .map(service -> toRow(service, driverLabels, vehiclePlates))
            .toList();

        String filename = "servizi_" + fromDate.format(CSV_FILENAME_MONTH) + "_" + toDate.format(CSV_FILENAME_MONTH)
            + (format == ServiceExportFormat.CSV ? ".csv" : ".xlsx");

        return switch (format) {
            case CSV -> new ExportedFile(toCsv(rows), CSV_MEDIA_TYPE, filename);
            case XLSX -> new ExportedFile(toXlsx(rows), XLSX_MEDIA_TYPE, filename);
        };
    }

    private ServiceExportRow toRow(ServiceDto service,
                                   Map<Long, String> driverLabels,
                                   Map<Long, String> vehiclePlates) {
        return new ServiceExportRow(
            service.id(),
            safe(service.externalBookingReference()),
            service.startAt() == null ? "-" : service.startAt().format(DATE_TIME_DISPLAY),
            safe(service.clientName()),
            service.assignedVehicleId() == null ? "-" : safe(vehiclePlates.get(service.assignedVehicleId())),
            safe(service.type() == null ? null : service.type().name()),
            safe(service.status() == null ? null : service.status().name()),
            service.price() == null ? BigDecimal.ZERO : service.price(),
            service.assignedDriverId() == null ? "-" : safe(driverLabels.get(service.assignedDriverId())),
            safe(service.notes())
        );
    }

    private byte[] toCsv(List<ServiceExportRow> rows) {
        List<String> lines = rows.stream()
            .map(row -> String.join(";",
                escapeCsv(String.valueOf(row.idServizio())),
                escapeCsv(row.rifEsterno()),
                escapeCsv(row.dataOra()),
                escapeCsv(row.cliente()),
                escapeCsv(row.targaVeicolo()),
                escapeCsv(row.tipoServizio()),
                escapeCsv(row.stato()),
                escapeCsv(row.importo().setScale(2, java.math.RoundingMode.HALF_UP).toPlainString().replace('.', ',')),
                escapeCsv(row.operatoreAssegnato()),
                escapeCsv(row.note())
            ))
            .toList();

        String header = "ID Servizio;Rif esterno;Data e ora;Cliente;Targa veicolo;Tipo servizio;Stato;Importo (€);Operatore assegnato;Note";
        String content = "\uFEFF" + header + "\n" + String.join("\n", lines);
        return content.getBytes(StandardCharsets.UTF_8);
    }

    private byte[] toXlsx(List<ServiceExportRow> rows) {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Servizi");
            CellStyle headerStyle = workbook.createCellStyle();
            var headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor((short) 22);
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);

            CellStyle currencyStyle = workbook.createCellStyle();
            currencyStyle.setDataFormat(workbook.createDataFormat().getFormat("[$EUR ]#,##0.00"));

            Row header = sheet.createRow(0);
            String[] labels = {
                "ID Servizio", "Rif esterno", "Data e ora", "Cliente", "Targa veicolo", "Tipo servizio",
                "Stato", "Importo (€)", "Operatore assegnato", "Note"
            };
            for (int index = 0; index < labels.length; index++) {
                var cell = header.createCell(index);
                cell.setCellValue(labels[index]);
                cell.setCellStyle(headerStyle);
            }

            int rowIndex = 1;
            for (ServiceExportRow row : rows) {
                Row sheetRow = sheet.createRow(rowIndex++);
                sheetRow.createCell(0).setCellValue(row.idServizio());
                sheetRow.createCell(1).setCellValue(row.rifEsterno());
                sheetRow.createCell(2).setCellValue(row.dataOra());
                sheetRow.createCell(3).setCellValue(row.cliente());
                sheetRow.createCell(4).setCellValue(row.targaVeicolo());
                sheetRow.createCell(5).setCellValue(row.tipoServizio());
                sheetRow.createCell(6).setCellValue(row.stato());
                var amountCell = sheetRow.createCell(7);
                amountCell.setCellValue(row.importo().doubleValue());
                amountCell.setCellStyle(currencyStyle);
                sheetRow.createCell(8).setCellValue(row.operatoreAssegnato());
                sheetRow.createCell(9).setCellValue(row.note());
            }

            for (int index = 0; index < labels.length; index++) {
                sheet.autoSizeColumn(index);
                sheet.setColumnWidth(index, Math.min(sheet.getColumnWidth(index) + 1024, 18000));
            }

            workbook.write(output);
            return output.toByteArray();
        } catch (IOException exception) {
            throw new ServiceExportGenerationException("Impossibile generare il file Excel", exception);
        }
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

    private String escapeCsv(String value) {
        if (value.contains(";") || value.contains("\"") || value.contains("\n")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }

    public enum ServiceExportFormat {
        CSV,
        XLSX
    }

    public record ExportedFile(byte[] content, String contentType, String filename) {
    }

    private record ServiceExportRow(Long idServizio,
                                    String rifEsterno,
                                    String dataOra,
                                    String cliente,
                                    String targaVeicolo,
                                    String tipoServizio,
                                    String stato,
                                    BigDecimal importo,
                                    String operatoreAssegnato,
                                    String note) {
    }
}
