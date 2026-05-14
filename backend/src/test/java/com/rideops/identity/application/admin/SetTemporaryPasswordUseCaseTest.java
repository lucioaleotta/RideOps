package com.rideops.identity.application.admin;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.rideops.identity.adapters.out.UserEntity;
import com.rideops.identity.application.PasswordPolicy;
import com.rideops.identity.domain.UserRole;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
class SetTemporaryPasswordUseCaseTest {

    @Mock
    private UserAdminRepositoryPort userAdminRepositoryPort;

    @Mock
    private UserAdminAuditLogPort userAdminAuditLogPort;

    @Mock
    private PasswordEncoder passwordEncoder;

    private SetTemporaryPasswordUseCase useCase;

    @BeforeEach
    void setUp() {
        useCase = new SetTemporaryPasswordUseCase(
            userAdminRepositoryPort,
            userAdminAuditLogPort,
            passwordEncoder,
            new PasswordPolicy()
        );
    }

    @Test
    void rejectInvalidTemporaryPassword() {
        UserAdminValidationException exception = assertThrows(
            UserAdminValidationException.class,
            () -> useCase.execute(10L, "weak", "admin01", 1L)
        );

        assertEquals(
            "La password deve avere almeno 8 caratteri con maiuscola, minuscola, numero e carattere speciale",
            exception.getMessage()
        );
        verifyNoInteractions(userAdminRepositoryPort, passwordEncoder);
    }

    @Test
    void throwWhenUserNotFound() {
        when(userAdminRepositoryPort.findById(11L)).thenReturn(Optional.empty());

        UserAdminNotFoundException exception = assertThrows(
            UserAdminNotFoundException.class,
            () -> useCase.execute(11L, "TempPass1!", "admin01", 1L)
        );

        assertEquals("Utente non trovato", exception.getMessage());
        verify(passwordEncoder, never()).encode(any());
    }

    @Test
    void encodeAndSaveTemporaryPassword() {
        UserEntity userEntity = new UserEntity();
        userEntity.setEmail("driver@example.com");
        userEntity.setUserId("driver01");
        userEntity.setRole(UserRole.DRIVER);
        userEntity.setPasswordHash("old-hash");

        when(userAdminRepositoryPort.findById(12L)).thenReturn(Optional.of(userEntity));
        when(passwordEncoder.encode("TempPass1!")).thenReturn("encoded-temp-password");
        when(userAdminRepositoryPort.save(userEntity)).thenReturn(userEntity);

        UserSummaryDto dto = useCase.execute(12L, "TempPass1!", "admin01", 1L);

        assertEquals("encoded-temp-password", userEntity.getPasswordHash());
        assertEquals("driver01", dto.userId());
        verify(userAdminRepositoryPort).save(userEntity);
        verify(userAdminAuditLogPort).save(any());
    }
}
