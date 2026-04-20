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

    private static final String ISSUER = "rideops";
    private static final String AUDIENCE = "rideops-api";

    private final SecretKey secretKey;
    private final long expirationSeconds;

    public JwtService(@Value("${security.jwt.secret}") String secret,
                      @Value("${security.jwt.expiration-seconds}") long expirationSeconds) {
        // SECURITY: secret DEVE essere una stringa Base64 di almeno 32 byte casuali (256 bit).
        // Generare con: openssl rand -base64 32
        // Il toBase64() originale era un double-encoding ridondante che mascherava chiavi deboli.
        this.secretKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
        this.expirationSeconds = expirationSeconds;
    }

    public String generateToken(IdentityUserDetails userDetails) {
        Instant now = Instant.now();
        Instant expiresAt = now.plusSeconds(expirationSeconds);

        return Jwts.builder()
            .subject(userDetails.getUsername())
            .issuer(ISSUER)
            .audience().add(AUDIENCE).and()
            .claim("uid", userDetails.getId())
            .claim("role", userDetails.getRole().name())
            .claim("tid", userDetails.getTenantId())
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

        // SECURITY: valida issuer e audience per prevenire token confusion (CWE-347)
        String issuer = claims.getIssuer();
        if (!ISSUER.equals(issuer)) {
            return false;
        }
        java.util.Set<String> audience = claims.getAudience();
        if (audience == null || !audience.contains(AUDIENCE)) {
            return false;
        }

        Object tokenTenant = claims.get("tid");
        boolean tenantMatches;
        if (tokenTenant == null && userDetails.getTenantId() == null) {
            // ADMIN: nessun tenant nel token né nell'utente
            tenantMatches = true;
        } else if (tokenTenant != null && userDetails.getTenantId() != null) {
            tenantMatches = Long.parseLong(tokenTenant.toString()) == userDetails.getTenantId().longValue();
        } else {
            tenantMatches = false;
        }
        return subject != null && subject.equalsIgnoreCase(userDetails.getUsername())
            && tenantMatches
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
}
