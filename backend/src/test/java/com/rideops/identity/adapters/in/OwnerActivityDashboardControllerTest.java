package com.rideops.identity.adapters.in;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.rideops.identity.application.dashboard.OwnerActivityDashboardService;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class OwnerActivityDashboardControllerTest {

    private OwnerActivityDashboardService service;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        service = Mockito.mock(OwnerActivityDashboardService.class);
        OwnerActivityDashboardController controller = new OwnerActivityDashboardController(service);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void kpisReturnsPayload() throws Exception {
        when(service.getKpis(eq(3))).thenReturn(new OwnerActivityDashboardService.KpisResponse(12, 4, 8, 2));

        mockMvc.perform(get("/owner/dashboard/kpis"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.total_services").value(12))
            .andExpect(jsonPath("$.active_clients").value(4))
            .andExpect(jsonPath("$.total_clients").value(8))
            .andExpect(jsonPath("$.avg_services_per_client").value(2));
    }

    @Test
    void top5ForwardsMonthsParam() throws Exception {
        when(service.getTop5(eq(6))).thenReturn(
            new OwnerActivityDashboardService.Top5Response(
                List.of(new OwnerActivityDashboardService.Top5Item(7L, "Acme", 22, 2.4, 30))
            )
        );

        mockMvc.perform(get("/owner/dashboard/top5").param("months", "6"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.top5[0].tenant_id").value(7))
            .andExpect(jsonPath("$.top5[0].tenant_name").value("Acme"));
    }

    @Test
    void clientsForwardsPagingParams() throws Exception {
        when(service.getClients(eq(6), eq(2), eq(20))).thenReturn(
            new OwnerActivityDashboardService.ClientsResponse(List.of(), 0, 2, 20, true)
        );

        mockMvc.perform(
                get("/owner/dashboard/clients")
                    .param("months", "6")
                    .param("page", "2")
                    .param("per_page", "20")
            )
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.page").value(2))
            .andExpect(jsonPath("$.per_page").value(20))
            .andExpect(jsonPath("$.paginated").value(true));
    }
}
