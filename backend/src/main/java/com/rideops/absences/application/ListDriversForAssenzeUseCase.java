package com.rideops.absences.application;

import com.rideops.identity.application.admin.UserAdminRepositoryPort;
import com.rideops.identity.domain.UserRole;
import java.util.Comparator;
import java.util.List;
import org.springframework.stereotype.Service;

/**
 * Driver selezionabili per la feature Assenze: esclude sempre i Driver Freelancer (master §1),
 * vincolo applicato nella query stessa e non solo in UI.
 */
@Service
public class ListDriversForAssenzeUseCase {

    private final UserAdminRepositoryPort userAdminRepositoryPort;

    public ListDriversForAssenzeUseCase(UserAdminRepositoryPort userAdminRepositoryPort) {
        this.userAdminRepositoryPort = userAdminRepositoryPort;
    }

    public List<DriverAssenzaOptionDto> execute() {
        return userAdminRepositoryPort.findAllByRoleInAndEnabledTrueOrderByEmailAsc(List.of(UserRole.DRIVER))
            .stream()
            .map(user -> new DriverAssenzaOptionDto(user.getId(), user.getFirstName(), user.getLastName()))
            .sorted(Comparator.comparing((DriverAssenzaOptionDto d) -> safe(d.lastName()))
                .thenComparing(d -> safe(d.firstName())))
            .toList();
    }

    private String safe(String value) {
        return value == null ? "" : value.toLowerCase();
    }
}
