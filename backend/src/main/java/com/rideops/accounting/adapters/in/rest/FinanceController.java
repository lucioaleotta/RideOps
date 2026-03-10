package com.rideops.accounting.adapters.in.rest;

import com.rideops.accounting.application.CategorySummaryItemDto;
import com.rideops.accounting.application.CreateFinancialTransactionUseCase;
import com.rideops.accounting.application.FinanceDashboardDto;
import com.rideops.accounting.application.FinancialTransactionCommand;
import com.rideops.accounting.application.FinancialTransactionDto;
import com.rideops.accounting.application.FinancialTransactionFilter;
import com.rideops.accounting.application.FinancialTransactionNotFoundException;
import com.rideops.accounting.application.FinancialValidationException;
import com.rideops.accounting.application.GenerateCategorySummaryUseCase;
import com.rideops.accounting.application.GenerateComparisonBetweenYearsUseCase;
import com.rideops.accounting.application.GenerateFinanceDashboardUseCase;
import com.rideops.accounting.application.GenerateMonthlySummaryUseCase;
import com.rideops.accounting.application.GenerateServiceStatisticsUseCase;
import com.rideops.accounting.application.GenerateYearlySummaryUseCase;
import com.rideops.accounting.application.ListFinancialTransactionsUseCase;
import com.rideops.accounting.application.MonthlyFinancePointDto;
import com.rideops.accounting.application.UpdateFinancialTransactionUseCase;
import com.rideops.accounting.application.VoidFinancialTransactionUseCase;
import com.rideops.accounting.application.YearComparisonDto;
import com.rideops.accounting.application.YearlyFinancePointDto;
import com.rideops.accounting.domain.FinancialTransactionCategory;
import com.rideops.accounting.domain.FinancialTransactionType;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/finance")
@PreAuthorize("hasAnyRole('ADMIN','GESTIONALE')")
public class FinanceController {

    private final CreateFinancialTransactionUseCase createUseCase;
    private final UpdateFinancialTransactionUseCase updateUseCase;
    private final VoidFinancialTransactionUseCase voidUseCase;
    private final ListFinancialTransactionsUseCase listUseCase;
    private final GenerateFinanceDashboardUseCase dashboardUseCase;
    private final GenerateMonthlySummaryUseCase monthlySummaryUseCase;
    private final GenerateYearlySummaryUseCase yearlySummaryUseCase;
    private final GenerateCategorySummaryUseCase categorySummaryUseCase;
    private final GenerateServiceStatisticsUseCase serviceStatisticsUseCase;
    private final GenerateComparisonBetweenYearsUseCase comparisonUseCase;

    public FinanceController(CreateFinancialTransactionUseCase createUseCase,
                             UpdateFinancialTransactionUseCase updateUseCase,
                             VoidFinancialTransactionUseCase voidUseCase,
                             ListFinancialTransactionsUseCase listUseCase,
                             GenerateFinanceDashboardUseCase dashboardUseCase,
                             GenerateMonthlySummaryUseCase monthlySummaryUseCase,
                             GenerateYearlySummaryUseCase yearlySummaryUseCase,
                             GenerateCategorySummaryUseCase categorySummaryUseCase,
                             GenerateServiceStatisticsUseCase serviceStatisticsUseCase,
                             GenerateComparisonBetweenYearsUseCase comparisonUseCase) {
        this.createUseCase = createUseCase;
        this.updateUseCase = updateUseCase;
        this.voidUseCase = voidUseCase;
        this.listUseCase = listUseCase;
        this.dashboardUseCase = dashboardUseCase;
        this.monthlySummaryUseCase = monthlySummaryUseCase;
        this.yearlySummaryUseCase = yearlySummaryUseCase;
        this.categorySummaryUseCase = categorySummaryUseCase;
        this.serviceStatisticsUseCase = serviceStatisticsUseCase;
        this.comparisonUseCase = comparisonUseCase;
    }

    @GetMapping("/transactions")
    public List<FinancialTransactionDto> listTransactions(
        @RequestParam(required = false) LocalDate fromDate,
        @RequestParam(required = false) LocalDate toDate,
        @RequestParam(required = false) FinancialTransactionType type,
        @RequestParam(required = false) FinancialTransactionCategory category,
        @RequestParam(required = false) Long serviceId,
        @RequestParam(required = false) Long vehicleId,
        @RequestParam(required = false) Long driverId,
        @RequestParam(required = false) Long deadlineOccurrenceId,
        @RequestParam(required = false) Boolean includeVoided,
        @RequestParam(required = false, defaultValue = "transactionDate") String sortBy,
        @RequestParam(required = false, defaultValue = "desc") String direction
    ) {
        return listUseCase.execute(new FinancialTransactionFilter(
            fromDate,
            toDate,
            type,
            category,
            serviceId,
            vehicleId,
            driverId,
            deadlineOccurrenceId,
            includeVoided,
            sortBy,
            direction
        ));
    }

    @PostMapping("/transactions")
    @ResponseStatus(HttpStatus.CREATED)
    public FinancialTransactionDto createTransaction(@Valid @RequestBody SaveTransactionRequest request) {
        return createUseCase.execute(toCommand(request));
    }

    @PutMapping("/transactions/{transactionId}")
    public FinancialTransactionDto updateTransaction(@PathVariable Long transactionId,
                                                     @Valid @RequestBody SaveTransactionRequest request) {
        return updateUseCase.execute(transactionId, toCommand(request));
    }

    @PostMapping("/transactions/{transactionId}/void")
    public FinancialTransactionDto voidTransaction(@PathVariable Long transactionId,
                                                   @Valid @RequestBody VoidTransactionRequest request) {
        return voidUseCase.execute(transactionId, request.reason());
    }

    @GetMapping("/dashboard")
    public FinanceDashboardDto dashboard(@RequestParam @Min(2020) @Max(2100) int year,
                                         @RequestParam @Min(1) @Max(12) int month) {
        return dashboardUseCase.execute(year, month);
    }

    @GetMapping("/summary/monthly")
    public List<MonthlyFinancePointDto> monthlySummary(@RequestParam @Min(2020) @Max(2100) int year) {
        return monthlySummaryUseCase.execute(year);
    }

    @GetMapping("/summary/yearly")
    public List<YearlyFinancePointDto> yearlySummary() {
        return yearlySummaryUseCase.execute();
    }

    @GetMapping("/costs/by-category")
    public List<CategorySummaryItemDto> costsByCategory(@RequestParam @Min(2020) @Max(2100) int year,
                                                        @RequestParam(required = false) @Min(1) @Max(12) Integer month) {
        return categorySummaryUseCase.execute(year, month, FinancialTransactionType.COSTO);
    }

    @GetMapping("/services/stats")
    public com.rideops.accounting.application.FinanceKpiSummaryDto serviceStats(
        @RequestParam @Min(2020) @Max(2100) int year,
        @RequestParam(required = false) @Min(1) @Max(12) Integer month
    ) {
        return serviceStatisticsUseCase.execute(year, month);
    }

    @GetMapping("/comparison")
    public YearComparisonDto comparison(@RequestParam @Min(2020) @Max(2100) int year,
                                        @RequestParam @Min(2020) @Max(2100) int compareWith) {
        return comparisonUseCase.execute(year, compareWith);
    }

    @ExceptionHandler(FinancialValidationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ErrorResponse handleValidation(FinancialValidationException exception) {
        return new ErrorResponse(exception.getMessage());
    }

    @ExceptionHandler(FinancialTransactionNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public ErrorResponse handleNotFound(FinancialTransactionNotFoundException exception) {
        return new ErrorResponse(exception.getMessage());
    }

    private FinancialTransactionCommand toCommand(SaveTransactionRequest request) {
        return new FinancialTransactionCommand(
            request.transactionType(),
            request.category(),
            request.description(),
            request.amount(),
            request.currency(),
            request.transactionDate(),
            request.serviceId(),
            request.vehicleId(),
            request.driverId(),
            request.deadlineOccurrenceId(),
            request.notes()
        );
    }

    record SaveTransactionRequest(
        @NotNull FinancialTransactionType transactionType,
        @NotNull FinancialTransactionCategory category,
        @NotBlank String description,
        @NotNull BigDecimal amount,
        @NotBlank String currency,
        @NotNull LocalDate transactionDate,
        Long serviceId,
        Long vehicleId,
        Long driverId,
        Long deadlineOccurrenceId,
        String notes
    ) {
    }

    record VoidTransactionRequest(@NotBlank String reason) {
    }

    record ErrorResponse(String message) {
    }
}
