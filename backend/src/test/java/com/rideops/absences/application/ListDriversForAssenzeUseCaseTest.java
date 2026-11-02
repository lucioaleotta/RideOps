package com.rideops.absences.application;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.when;

import com.rideops.identity.adapters.out.UserEntity;
import com.rideops.identity.domain.UserRole;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.rideops.identity.application.admin.UserAdminRepositoryPort;

@ExtendWith(MockitoExtension.class)
class ListDriversForAssenzeUseCaseTest {

    @Mock
    private UserAdminRepositoryPort userAdminRepositoryPort;

    private ListDriversForAssenzeUseCase useCase;

    @BeforeEach
    void setUp() {
        useCase = new ListDriversForAssenzeUseCase(userAdminRepositoryPort);
    }

    @Test
    void excludesFreelancersByQueryingOnlyDriverRole() {
        UserEntity driver = new UserEntity();
        driver.setUserId("sofia.conti");
        driver.setEmail("sofia@rideops.local");
        driver.setPasswordHash("hash");
        driver.setRole(UserRole.DRIVER);
        driver.setFirstName("Sofia");
        driver.setLastName("Conti");

        when(userAdminRepositoryPort.findAllByRoleInAndEnabledTrueOrderByEmailAsc(List.of(UserRole.DRIVER)))
            .thenReturn(List.of(driver));

        List<DriverAssenzaOptionDto> result = useCase.execute();

        assertEquals(1, result.size());
        assertEquals("Sofia", result.get(0).firstName());
    }
}
