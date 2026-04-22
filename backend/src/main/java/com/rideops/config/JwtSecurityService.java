package com.rideops.config;

import com.rideops.identity.application.IdentityUserDetails;
import com.rideops.identity.application.JwtService;
import org.springframework.stereotype.Service;

/**
 * Security layer service for JWT token generation and validation.
 * This service encapsulates JWT operations and ensures they are only performed
 * in the security/config layer, preventing direct JwtService access from adapters.
 * 
 * SECURITY: Consolidates JWT operations in one place per CWE-522 best practices.
 * ARCHITECTURE: Ensures separation between authentication (config layer) and
 * business logic (application layer).
 */
@Service
public class JwtSecurityService {

    private final JwtService jwtService;

    public JwtSecurityService(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    /**
     * Generates JWT token for authenticated user.
     * @param userDetails authenticated user details
     * @return JWT token string
     */
    public String generateToken(IdentityUserDetails userDetails) {
        return jwtService.generateToken(userDetails);
    }

    /**
     * Gets JWT token expiration time in seconds.
     * @return expiration seconds
     */
    public long getExpirationSeconds() {
        return jwtService.getExpirationSeconds();
    }
}
