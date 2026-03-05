package com.rideops.identity.application;

import com.rideops.identity.adapters.out.EmailOutboxEntity;
import com.rideops.identity.adapters.out.EmailOutboxRepository;
import com.rideops.identity.adapters.out.PasswordResetTokenEntity;
import com.rideops.identity.adapters.out.PasswordResetTokenRepository;
import com.rideops.identity.adapters.out.UserEntity;
import com.rideops.identity.adapters.out.UserRepository;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.UUID;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    public PasswordResetService(UserRepository userRepository,
                                PasswordResetTokenRepository tokenRepository,
                                EmailOutboxRepository outboxRepository,
                                PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.outboxRepository = outboxRepository;
        this.passwordEncoder = passwordEncoder;
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
            .orElseThrow(() -> new IllegalArgumentException("Invalid token"));

        if (token.getUsedAt() != null || token.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new IllegalArgumentException("Invalid token");
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
        token.setUser(user);
        token.setTokenHash(hash(rawToken));
        token.setExpiresAt(LocalDateTime.now().plusMinutes(TOKEN_TTL_MINUTES));
        tokenRepository.save(token);

        String resetPath = "/reset-password?token=" + rawToken;
        String body = "Reset password link (MVP email stub): " + resetPath;

        EmailOutboxEntity outbox = new EmailOutboxEntity();
        outbox.setRecipient(user.getEmail());
        outbox.setSubject("RideOps password reset");
        outbox.setBody(body);
        outboxRepository.save(outbox);

        LOGGER.info("Password reset requested for {}. Stub link: {}", user.getEmail(), resetPath);
    }

    private String hash(String rawToken) {
        try {
            MessageDigest messageDigest = MessageDigest.getInstance("SHA-256");
            byte[] digest = messageDigest.digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception exception) {
            throw new IllegalStateException("Cannot hash reset token", exception);
        }
    }
}
