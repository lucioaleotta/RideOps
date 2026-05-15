package com.rideops.identity.application;

import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.rideops.identity.adapters.out.EmailOutboxEntity;
import com.rideops.identity.adapters.out.EmailOutboxRepository;
import com.rideops.identity.adapters.out.PasswordResetTokenEntity;
import com.rideops.identity.adapters.out.PasswordResetTokenRepository;
import com.rideops.identity.adapters.out.UserEntity;
import com.rideops.identity.adapters.out.UserRepository;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;

@ExtendWith(MockitoExtension.class)
@SuppressWarnings("null")
class PasswordResetServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordResetTokenRepository tokenRepository;

    @Mock
    private EmailOutboxRepository outboxRepository;

    @Mock
    private BrevoEmailClient brevoEmailClient;

    @Mock
    private PasswordEncoder passwordEncoder;

    private PasswordResetService service;

    @BeforeEach
    void setUp() {
        service = new PasswordResetService(
            userRepository,
            tokenRepository,
            outboxRepository,
            brevoEmailClient,
            passwordEncoder,
            "https://rideops.it",
            "test-secret"
        );
    }

    @Test
    void requestResetUsesPersistedEmailAndAllowsNullTenantForAdmin() {
        UserEntity admin = new UserEntity();
        setField(admin, "id", 99L);
        admin.setTenantId(null);
        admin.setUserId("ADMIN");
        admin.setEmail("admin@rideops.local");
        admin.setFirstName("Admin");

        when(userRepository.findByUserIdIgnoreCase("ADMIN")).thenReturn(Optional.of(admin));
        when(tokenRepository.findByUserAndUsedAtIsNull(admin)).thenReturn(List.of());
        when(tokenRepository.save(any(PasswordResetTokenEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(outboxRepository.save(any(EmailOutboxEntity.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.requestReset("  ADMIN  ");

        ArgumentCaptor<PasswordResetTokenEntity> tokenCaptor = ArgumentCaptor.forClass(PasswordResetTokenEntity.class);
        verify(tokenRepository).save(tokenCaptor.capture());
        assertNull(tokenCaptor.getValue().getTenantId());

        ArgumentCaptor<EmailOutboxEntity> outboxCaptor = ArgumentCaptor.forClass(EmailOutboxEntity.class);
        verify(outboxRepository).save(outboxCaptor.capture());
        assertNull(outboxCaptor.getValue().getTenantId());

        verify(brevoEmailClient).sendTemplateEmail(
            eq(null),
            eq("admin@rideops.local"),
            eq("Admin"),
            eq(BrevoTemplates.RESET_PASSWORD),
            any()
        );
    }

    @Test
    void requestResetDoesNotTriggerAnyActionForUnknownUserId() {
        when(userRepository.findByUserIdIgnoreCase("missing-user")).thenReturn(Optional.empty());

        service.requestReset("missing-user");

        verify(tokenRepository, never()).save(any());
        verify(outboxRepository, never()).save(any());
        verify(brevoEmailClient, never()).sendTemplateEmail(any(), any(), any(), any(Integer.class), any());
    }

    private void setField(Object target, String fieldName, Object value) {
        try {
            var field = target.getClass().getDeclaredField(fieldName);
            field.setAccessible(true);
            field.set(target, value);
        } catch (ReflectiveOperationException exception) {
            throw new IllegalStateException(exception);
        }
    }
}