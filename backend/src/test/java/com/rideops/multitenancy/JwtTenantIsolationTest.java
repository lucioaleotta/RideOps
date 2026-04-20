package com.rideops.multitenancy;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.rideops.identity.adapters.out.UserEntity;
import com.rideops.identity.application.IdentityUserDetails;
import com.rideops.identity.application.JwtService;
import com.rideops.identity.domain.UserRole;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import javax.crypto.SecretKey;
import org.junit.jupiter.api.Test;

class JwtTenantIsolationTest {

    // JwtService expects a Base64-encoded secret (decoded at startup)
    private static final String SECRET_RAW = "rideops-secret-for-tests-should-be-long-enough";
    private static final String SECRET = java.util.Base64.getEncoder()
        .encodeToString(SECRET_RAW.getBytes(java.nio.charset.StandardCharsets.UTF_8));

    @Test
    void tokenContainsTenantClaim() {
        JwtService jwtService = new JwtService(SECRET, 3600);
        IdentityUserDetails user = principalWithTenant(10L, 7L);

        String token = jwtService.generateToken(user);
        Claims claims = parseClaims(token);

        assertEquals("7", claims.get("tid").toString());
    }

    @Test
    void tokenIsRejectedWhenTenantDiffers() {
        JwtService jwtService = new JwtService(SECRET, 3600);
        String token = jwtService.generateToken(principalWithTenant(10L, 7L));

        assertTrue(jwtService.isTokenValid(token, principalWithTenant(10L, 7L)));
        assertFalse(jwtService.isTokenValid(token, principalWithTenant(10L, 99L)));
    }

    private IdentityUserDetails principalWithTenant(Long id, Long tenantId) {
        UserEntity user = new UserEntity();
        setField(user, "id", id);
        user.setUserId("user" + id);
        user.setEmail("user" + id + "@rideops.local");
        user.setPasswordHash("hash");
        user.setRole(UserRole.ADMIN);
        user.setEnabled(true);
        user.setTenantId(tenantId);
        return new IdentityUserDetails(user);
    }

    private Claims parseClaims(String token) {
        SecretKey key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(SECRET));
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
    }

    private String toBase64(String secret) {
        return java.util.Base64.getEncoder().encodeToString(secret.getBytes(java.nio.charset.StandardCharsets.UTF_8));
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
