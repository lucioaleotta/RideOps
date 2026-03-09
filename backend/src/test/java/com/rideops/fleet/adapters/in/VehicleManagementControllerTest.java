package com.rideops.fleet.adapters.in;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.rideops.fleet.application.PlanSyncResultDto;
import com.rideops.fleet.application.VehicleDetailDto;
import com.rideops.fleet.application.VehicleDto;
import com.rideops.fleet.application.VehicleManagementService;
import com.rideops.fleet.domain.VehicleType;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mockito;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

class VehicleManagementControllerTest {

    private VehicleManagementService service;
    private MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        service = Mockito.mock(VehicleManagementService.class);
        VehicleManagementController controller = new VehicleManagementController(service);
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void getVehicleDetailReturnsPayload() throws Exception {
        VehicleDto vehicle = new VehicleDto(
            5L,
            "AB123CD",
            4,
            VehicleType.SEDAN,
            null,
            LocalDateTime.now(),
            LocalDateTime.now()
        );

        when(service.getVehicleDetail(eq(5L), eq(30)))
            .thenReturn(new VehicleDetailDto(vehicle, 2, 1, List.of(), List.of()));

        mockMvc.perform(get("/fleet/vehicles/5/detail"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.vehicle.plate").value("AB123CD"))
            .andExpect(jsonPath("$.upcomingCount").value(2))
            .andExpect(jsonPath("$.overdueCount").value(1));
    }

    @Test
    void syncMissingOccurrencesReturnsCounters() throws Exception {
        when(service.syncMissingOccurrencesFromActivePlans())
            .thenReturn(new PlanSyncResultDto(3, 3, 1, 2));

        mockMvc.perform(post("/fleet/plans/sync-missing-occurrences"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.plansScanned").value(3))
            .andExpect(jsonPath("$.plansActive").value(3))
            .andExpect(jsonPath("$.occurrencesCreated").value(1))
            .andExpect(jsonPath("$.occurrencesAlreadyPresent").value(2));
    }
}
