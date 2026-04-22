package com.rideops.identity.application.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.rideops.identity.adapters.out.UserEntity;
import com.rideops.identity.domain.UserRole;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class UpdateOwnDriverProfileUseCaseTest {

    @Mock
    private UserAdminRepositoryPort userAdminRepositoryPort;

    @Mock
    private UserAdminAuditLogPort userAdminAuditLogPort;

    @Mock
    private org.springframework.security.crypto.password.PasswordEncoder passwordEncoder;

    private UpdateOwnDriverProfileUseCase useCase;

    @BeforeEach
    void setUp() {
        CreateUserUseCase createUserUseCase = new CreateUserUseCase(
            userAdminRepositoryPort,
            userAdminAuditLogPort,
            passwordEncoder
        );
        useCase = new UpdateOwnDriverProfileUseCase(userAdminRepositoryPort, createUserUseCase);
    }

    @Test
    void rejectWhenUserIsNotDriver() {
        UserEntity user = new UserEntity();
        user.setRole(UserRole.ADMIN);

        when(userAdminRepositoryPort.findById(10L)).thenReturn(Optional.of(user));

        UserAdminValidationException exception = assertThrows(
            UserAdminValidationException.class,
            () -> useCase.execute(
                10L,
                "Mario",
                "Rossi",
                LocalDate.of(1985, 3, 12),
                "MI1234567B",
                "mario.rossi@rideops.it",
                List.of("B"),
                List.of("Via Roma 1, Milano"),
                "+39 335 1122334",
                LocalDate.of(2028, 6, 30)
            )
        );

        assertEquals("L'utente non e` un driver", exception.getMessage());
        verify(userAdminRepositoryPort, never()).save(user);
    }

    @Test
    void rejectDuplicateEmailWhenChanged() {
        UserEntity user = new UserEntity();
        user.setRole(UserRole.DRIVER);
        user.setEmail("old@rideops.it");

        when(userAdminRepositoryPort.findById(11L)).thenReturn(Optional.of(user));
        when(userAdminRepositoryPort.existsByEmailIgnoreCase("new@rideops.it")).thenReturn(true);

        UserAdminValidationException exception = assertThrows(
            UserAdminValidationException.class,
            () -> useCase.execute(
                11L,
                "Mario",
                "Rossi",
                LocalDate.of(1985, 3, 12),
                "MI1234567B",
                "new@rideops.it",
                List.of("B"),
                List.of("Via Roma 1, Milano"),
                "+39 335 1122334",
                LocalDate.of(2028, 6, 30)
            )
        );

        assertEquals("L'email esiste gia`", exception.getMessage());
        verify(userAdminRepositoryPort, never()).save(user);
        verifyNoInteractions(userAdminAuditLogPort, passwordEncoder);
    }

    @Test
    void updateAnagraficaAndContactData() {
        UserEntity user = new UserEntity();
        user.setUserId("mario.rossi");
        user.setRole(UserRole.DRIVER);
        user.setEmail("old@rideops.it");
        user.setEnabled(true);

        when(userAdminRepositoryPort.findById(12L)).thenReturn(Optional.of(user));
        when(userAdminRepositoryPort.existsByEmailIgnoreCase("luigi.bianchi@rideops.it")).thenReturn(false);
        when(userAdminRepositoryPort.save(user)).thenReturn(user);

        UserSummaryDto dto = useCase.execute(
            12L,
            "Luigi",
            "Bianchi",
            LocalDate.of(1978, 11, 22),
            "MI9876543A",
            "luigi.bianchi@rideops.it",
            List.of("B", "D"),
            List.of("Corso Buenos Aires 55, Milano"),
            "+39 347 5566778",
            LocalDate.of(2027, 9, 15)
        );

        assertEquals("luigi.bianchi@rideops.it", user.getEmail());
        assertEquals("Luigi", user.getFirstName());
        assertEquals("Bianchi", user.getLastName());
        assertEquals(LocalDate.of(1978, 11, 22), user.getBirthDate());
        assertEquals("MI9876543A", user.getLicenseNumber());
        assertEquals("[\"B\",\"D\"]", user.getLicenseTypesJson());
        assertEquals("[\"Corso Buenos Aires 55, Milano\"]", user.getResidentialAddressesJson());
        assertEquals("+39 347 5566778", user.getMobilePhone());
        assertEquals(LocalDate.of(2027, 9, 15), user.getLicenseExpiryDate());
        assertEquals("mario.rossi", dto.userId());

        verify(userAdminRepositoryPort).save(user);
    }
}
