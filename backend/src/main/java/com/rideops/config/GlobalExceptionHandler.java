package com.rideops.config;

import com.rideops.logging.LogSanitizer;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    /**
     * Il TenantContext lancia IllegalStateException quando un utente ADMIN (senza tenant)
     * accede a risorse che richiedono un tenant. È comportamento atteso, non un errore.
     */
    @ExceptionHandler(IllegalStateException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public void handleIllegalState(IllegalStateException ex, HttpServletRequest request) {
        log.warn("action=access.denied path={} outcome=failure reason={}",
            request.getRequestURI(), LogSanitizer.sanitize(ex.getMessage()));
    }

    /**
     * Eccezioni HTTP esplicite (ResponseStatusException): loggale come WARN se 4xx,
     * ERROR se 5xx. Non includere mai il body della request.
     */
    @ExceptionHandler(ResponseStatusException.class)
    public void handleResponseStatus(ResponseStatusException ex, HttpServletRequest request,
                                     jakarta.servlet.http.HttpServletResponse response) throws Exception {
        response.setStatus(ex.getStatusCode().value());
        int status = ex.getStatusCode().value();
        if (status >= 500) {
            log.error("action=http.error path={} status={} outcome=failure reason={}",
                request.getRequestURI(), status, LogSanitizer.sanitize(ex.getReason()));
        } else {
            log.warn("action=http.error path={} status={} outcome=failure reason={}",
                request.getRequestURI(), status, LogSanitizer.sanitize(ex.getReason()));
        }
    }

    /**
     * Catch-all per eccezioni non gestite: ERROR con stack trace (visibile solo in dev/DEBUG).
     * In produzione lo stack trace è compresso da logstash-logback-encoder.
     */
    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public void handleUnexpected(Exception ex, HttpServletRequest request) {
        log.error("action=unhandled.exception path={} outcome=failure",
            request.getRequestURI(), ex);
    }
}
