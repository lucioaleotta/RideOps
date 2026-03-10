package com.rideops.accounting.adapters.in;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.rideops.accounting.adapters.in.rest.FinanceController;
import com.rideops.accounting.application.CreateFinancialTransactionUseCase;
import com.rideops.accounting.application.FinanceKpiSummaryDto;
import com.rideops.accounting.application.GenerateCategorySummaryUseCase;
import com.rideops.accounting.application.GenerateComparisonBetweenYearsUseCase;
import com.rideops.accounting.application.GenerateFinanceDashboardUseCase;
import com.rideops.accounting.application.GenerateMonthlySummaryUseCase;
import com.rideops.accounting.application.GenerateServiceStatisticsUseCase;
import com.rideops.accounting.application.GenerateYearlySummaryUseCase;
import com.rideops.accounting.application.ListFinancialTransactionsUseCase;
import com.rideops.accounting.application.UpdateFinancialTransactionUseCase;
import com.rideops.accounting.application.VoidFinancialTransactionUseCase;
import com.rideops.accounting.application.FinancialTransactionDto;
import com.rideops.accounting.domain.FinancialTransactionCategory;
import com.rideops.accounting.domain.FinancialTransactionType;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class FinanceControllerTest {

    private CreateFinancialTransactionUseCase createUseCase;
    private UpdateFinancialTransactionUseCase updateUseCase;
    private VoidFinancialTransactionUseCase voidUseCase;
    private ListFinancialTransactionsUseCase listUseCase;
    private GenerateFinanceDashboardUseCase dashboardUseCase;
    private GenerateMonthlySummaryUseCase monthlySummaryUseCase;
    private GenerateYearlySummaryUseCase yearlySummaryUseCase;
    private GenerateCategorySummaryUseCase categorySummaryUseCase;
    private GenerateServiceStatisticsUseCase serviceStatisticsUseCase;
    private GenerateComparisonBetweenYearsUseCase comparisonUseCase;

    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        createUseCase = Mockito.mock(CreateFinancialTransactionUseCase.class);
        updateUseCase = Mockito.mock(UpdateFinancialTransactionUseCase.class);
        voidUseCase = Mockito.mock(VoidFinancialTransactionUseCase.class);
        listUseCase = Mockito.mock(ListFinancialTransactionsUseCase.class);
        dashboardUseCase = Mockito.mock(GenerateFinanceDashboardUseCase.class);
        monthlySummaryUseCase = Mockito.mock(GenerateMonthlySummaryUseCase.class);
        yearlySummaryUseCase = Mockito.mock(GenerateYearlySummaryUseCase.class);
        categorySummaryUseCase = Mockito.mock(GenerateCategorySummaryUseCase.class);
        serviceStatisticsUseCase = Mockito.mock(GenerateServiceStatisticsUseCase.class);
        comparisonUseCase = Mockito.mock(GenerateComparisonBetweenYearsUseCase.class);

        FinanceController controller = new FinanceController(
            createUseCase,
            updateUseCase,
            voidUseCase,
            listUseCase,
            dashboardUseCase,
            monthlySummaryUseCase,
            yearlySummaryUseCase,
            categorySummaryUseCase,
            serviceStatisticsUseCase,
            comparisonUseCase
        );

        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void listTransactionsReturnsPayload() throws Exception {
        when(listUseCase.execute(any())).thenReturn(List.of(new FinancialTransactionDto(
            1L,
            FinancialTransactionType.RICAVO,
            FinancialTransactionCategory.SERVIZIO,
            "Incasso",
            BigDecimal.valueOf(100),
            "EUR",
            LocalDate.of(2026, 3, 10),
            10L,
            2L,
            5L,
            null,
            null,
            false,
            false,
            null,
            null,
            LocalDateTime.now(),
            LocalDateTime.now()
        )));

        mockMvc.perform(get("/finance/transactions"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].transactionType").value("RICAVO"))
            .andExpect(jsonPath("$[0].category").value("SERVIZIO"));
    }

    @Test
    void serviceStatsReturnsKpi() throws Exception {
        when(serviceStatisticsUseCase.execute(eq(2026), eq(3)))
            .thenReturn(new FinanceKpiSummaryDto(
                12,
                BigDecimal.valueOf(1400),
                BigDecimal.valueOf(500),
                BigDecimal.valueOf(1400),
                BigDecimal.valueOf(900),
                BigDecimal.valueOf(116.66),
                BigDecimal.valueOf(41.66)
            ));

        mockMvc.perform(get("/finance/services/stats").param("year", "2026").param("month", "3"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.totalServices").value(12))
            .andExpect(jsonPath("$.totalRevenue").value(1400));
    }

    @Test
    void createTransactionReturnsCreated() throws Exception {
        when(createUseCase.execute(any())).thenReturn(new FinancialTransactionDto(
            2L,
            FinancialTransactionType.COSTO,
            FinancialTransactionCategory.CARBURANTE,
            "Fuel",
            BigDecimal.valueOf(75),
            "EUR",
            LocalDate.of(2026, 3, 10),
            null,
            3L,
            null,
            null,
            null,
            false,
            false,
            null,
            null,
            LocalDateTime.now(),
            LocalDateTime.now()
        ));

        mockMvc.perform(post("/finance/transactions")
                .contentType("application/json")
                .content("""
                    {
                      "transactionType": "COSTO",
                      "category": "CARBURANTE",
                      "description": "Fuel",
                      "amount": 75,
                      "currency": "EUR",
                      "transactionDate": "2026-03-10",
                      "vehicleId": 3
                    }
                    """))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.category").value("CARBURANTE"));
    }
}
