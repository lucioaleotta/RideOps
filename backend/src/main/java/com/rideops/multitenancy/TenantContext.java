package com.rideops.multitenancy;

import com.rideops.identity.application.IdentityUserDetails;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class TenantContext {

    public Long requireTenantId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof IdentityUserDetails userDetails)) {
            throw new IllegalStateException("Tenant non disponibile nel contesto di sicurezza");
        }

        Long tenantId = userDetails.getTenantId();
        if (tenantId == null) {
            throw new IllegalStateException("Tenant non valorizzato per l'utente autenticato");
        }

        return tenantId;
    }

    /**
     * Restituisce il tenantId dell'utente autenticato, o null se l'utente e` ADMIN (senza tenant).
     */
    public Long getTenantIdOrNull() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof IdentityUserDetails userDetails)) {
            return null;
        }
        return userDetails.getTenantId();
    }
}
