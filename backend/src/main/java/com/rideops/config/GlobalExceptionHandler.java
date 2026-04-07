package com.rideops.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Il TenantContext lancia IllegalStateException quando un utente ADMIN (senza tenant)
     * accede a risorse che richiedono un tenant. È comportamento atteso, non un errore.
     */
    @ExceptionHandler(IllegalStateException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public void handleIllegalState(IllegalStateException ex) {
        log.debug("Accesso negato per contesto tenant non disponibile: {}", ex.getMessage());
    }
}
