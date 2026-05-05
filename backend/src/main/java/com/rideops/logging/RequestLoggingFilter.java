package com.rideops.logging;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.util.ContentCachingResponseWrapper;

/**
 * Logga ogni richiesta HTTP in entrata con metodo, path, statusCode e durationMs.
 *
 * <p>Non loga mai il body né l'header Authorization (PCI DSS / sicurezza).</p>
 *
 * <p>Esempio di riga JSON generata in produzione:</p>
 * <pre>
 * {
 *   "timestamp": "2026-05-05T10:23:01.123Z",
 *   "level":     "INFO",
 *   "traceId":   "a1b2c3d4-...",
 *   "service":   "rideops",
 *   "action":    "http.request",
 *   "message":   "POST /auth/login → 200 (45ms)",
 *   "method":    "POST",
 *   "path":      "/auth/login",
 *   "status":    200,
 *   "durationMs": 45,
 *   "outcome":   "success"
 * }
 * </pre>
 */
@Component
@Order(2)
public class RequestLoggingFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RequestLoggingFilter.class);

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {

        // Wrappa la response per leggere lo status code dopo il processing
        ContentCachingResponseWrapper wrappedResponse = new ContentCachingResponseWrapper(response);

        long start = System.currentTimeMillis();
        try {
            chain.doFilter(request, wrappedResponse);
        } finally {
            long durationMs = System.currentTimeMillis() - start;
            int status = wrappedResponse.getStatus();
            String method = request.getMethod();
            String path = request.getRequestURI();
            String outcome = (status < 400) ? "success" : "failure";

            if (status >= 500) {
                log.error("action=http.request method={} path={} status={} durationMs={} outcome={}",
                    method, path, status, durationMs, outcome);
            } else if (status >= 400) {
                log.warn("action=http.request method={} path={} status={} durationMs={} outcome={}",
                    method, path, status, durationMs, outcome);
            } else {
                log.info("action=http.request method={} path={} status={} durationMs={} outcome={}",
                    method, path, status, durationMs, outcome);
            }

            // Copia il body nella response originale (obbligatorio con ContentCachingResponseWrapper)
            wrappedResponse.copyBodyToResponse();
        }
    }

    /** Esclude gli health check di Actuator dal logging per non inquinare i log. */
    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        return path.startsWith("/actuator/");
    }
}
