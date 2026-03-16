package com.rideops.identity.application.admin;

import com.rideops.identity.domain.UserRole;
import com.rideops.services.application.CountActiveAssignedServicesByDriverUseCase;
import java.util.Objects;
import org.springframework.stereotype.Service;

@Service
public class SetDriverEnabledUseCase {

    private final UserAdminRepositoryPort userAdminRepositoryPort;
    private final CountActiveAssignedServicesByDriverUseCase countActiveAssignedServicesByDriverUseCase;

    public SetDriverEnabledUseCase(UserAdminRepositoryPort userAdminRepositoryPort,
                                   CountActiveAssignedServicesByDriverUseCase countActiveAssignedServicesByDriverUseCase) {
        this.userAdminRepositoryPort = userAdminRepositoryPort;
        this.countActiveAssignedServicesByDriverUseCase = countActiveAssignedServicesByDriverUseCase;
    }

    public UserSummaryDto execute(Long driverId, boolean enabled) {
        Long safeDriverId = Objects.requireNonNull(driverId, "driverId obbligatorio");
        var driver = userAdminRepositoryPort.findById(safeDriverId)
            .orElseThrow(() -> new UserAdminNotFoundException("Driver non trovato"));

        if (driver.getRole() != UserRole.DRIVER) {
            throw new UserAdminValidationException("L'utente non e` un driver");
        }

        if (!enabled) {
            long activeAssignedServices = countActiveAssignedServicesByDriverUseCase.execute(safeDriverId);
            if (activeAssignedServices > 0) {
                throw new UserAdminValidationException(
                    "Impossibile rimuovere il driver: ci sono servizi aperti assegnati. Prima modificare i servizi."
                );
            }
        }

        driver.setEnabled(enabled);
        return UserAdminMapper.toDto(userAdminRepositoryPort.save(driver));
    }
}
