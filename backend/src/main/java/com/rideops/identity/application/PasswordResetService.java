package com.rideops.identity.application;

import com.rideops.identity.adapters.out.EmailOutboxEntity;
import com.rideops.identity.adapters.out.EmailOutboxRepository;
import com.rideops.identity.adapters.out.PasswordResetTokenEntity;
import com.rideops.identity.adapters.out.PasswordResetTokenRepository;
import com.rideops.identity.adapters.out.UserEntity;
import com.rideops.identity.adapters.out.UserRepository;
import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.UUID;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class PasswordResetService {

    private static final Logger LOGGER = LoggerFactory.getLogger(PasswordResetService.class);
    private static final long TOKEN_TTL_MINUTES = 30;

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final EmailOutboxRepository outboxRepository;
    private final PasswordEncoder passwordEncoder;
    private final String tokenHashSecret;

    public PasswordResetService(UserRepository userRepository,
                                PasswordResetTokenRepository tokenRepository,
                                EmailOutboxRepository outboxRepository,
                                PasswordEncoder passwordEncoder,
                                @Value("${app.security.password-reset.hash-secret:${security.jwt.secret}}")
                                String tokenHashSecret) {
        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.outboxRepository = outboxRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenHashSecret = tokenHashSecret;
    }

    @Transactional
    public void requestReset(String email) {
        userRepository.findByEmailIgnoreCase(email)
            .ifPresent(this::createTokenAndOutboxEmail);
    }

    @Transactional
    public void resetPassword(String rawToken, String newPassword) {
        String tokenHash = hash(rawToken);
        PasswordResetTokenEntity token = tokenRepository.findByTokenHash(tokenHash)
            .orElseThrow(() -> new IllegalArgumentException("Token non valido"));

        if (token.getUsedAt() != null || token.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Token non valido");
        }

        UserEntity user = token.getUser();
        user.setPasswordHash(passwordEncoder.encode(newPassword));

        token.setUsedAt(LocalDateTime.now());
        userRepository.save(user);
        tokenRepository.save(token);
    }

    private void createTokenAndOutboxEmail(UserEntity user) {
        tokenRepository.findByUserAndUsedAtIsNull(user)
            .forEach(existing -> {
                existing.setUsedAt(LocalDateTime.now());
                tokenRepository.save(existing);
            });

        String rawToken = UUID.randomUUID().toString() + UUID.randomUUID().toString().replace("-", "");

        PasswordResetTokenEntity token = new PasswordResetTokenEntity();
        token.setTenantId(user.getTenantId());
        token.setUser(user);
        token.setTokenHash(hash(rawToken));
        token.setExpiresAt(LocalDateTime.now().plusMinutes(TOKEN_TTL_MINUTES));
        tokenRepository.save(token);

        String resetPath = "/reset-password?token=" + rawToken;
        String body = "Link reset password (stub email MVP): " + resetPath;

        EmailOutboxEntity outbox = new EmailOutboxEntity();
        outbox.setTenantId(user.getTenantId());
        outbox.setRecipient(user.getEmail());
        outbox.setSubject("RideOps reimpostazione password");
        outbox.setBody(body);
        outboxRepository.save(outbox);

        // SECURITY: non loggare mai il token raw né l'email utente per evitare
        // CWE-532 (token nei log) e CWE-117 (log injection via email).
        LOGGER.info("Password reset token generated for userId={}", user.getId());
    }

    private String hash(String rawToken) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(tokenHashSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] digest = mac.doFinal(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception exception) {
            throw new IllegalStateException("Impossibile calcolare hash token reset", exception);
        }
    }
}
