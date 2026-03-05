package com.rideops.identity.application;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {

    private final SecretKey secretKey;
    private final long expirationSeconds;

    public JwtService(@Value("${security.jwt.secret}") String secret,
                      @Value("${security.jwt.expiration-seconds}") long expirationSeconds) {
        this.secretKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(toBase64(secret)));
        this.expirationSeconds = expirationSeconds;
    }

    public String generateToken(IdentityUserDetails userDetails) {
        Instant now = Instant.now();
        Instant expiresAt = now.plusSeconds(expirationSeconds);

        return Jwts.builder()
            .subject(userDetails.getUsername())
            .claim("uid", userDetails.getId())
            .claim("role", userDetails.getRole().name())
            .issuedAt(Date.from(now))
            .expiration(Date.from(expiresAt))
            .signWith(secretKey)
            .compact();
    }

    public String extractUsername(String token) {
        return extractAllClaims(token).getSubject();
    }

    public boolean isTokenValid(String token, IdentityUserDetails userDetails) {
        Claims claims = extractAllClaims(token);
        String subject = claims.getSubject();
        Date expiration = claims.getExpiration();
        return subject != null && subject.equalsIgnoreCase(userDetails.getUsername())
            && expiration != null && expiration.after(new Date());
    }

    public long getExpirationSeconds() {
        return expirationSeconds;
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
            .verifyWith(secretKey)
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }

    private String toBase64(String secret) {
        return java.util.Base64.getEncoder().encodeToString(secret.getBytes(java.nio.charset.StandardCharsets.UTF_8));
    }
}
