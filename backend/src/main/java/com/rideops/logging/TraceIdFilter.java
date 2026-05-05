package com.rideops.logging;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Assegna un {@code traceId} univoco a ogni richiesta HTTP e lo mette nel MDC
 * di SLF4J, rendendolo disponibile in tutti i log della stessa request.
 *
 * <p>Esegue prima di {@link RequestLoggingFilter} grazie a {@code @Order(1)}.</p>
 *
 * <p>Accetta un {@code X-Trace-Id} dal client (gateway/load-balancer) per
 * propagare la correlazione end-to-end; se assente ne genera uno nuovo.</p>
 */
@Component
@Order(1)
public class TraceIdFilter extends OncePerRequestFilter {

    static final String MDC_TRACE_ID = "traceId";
    static final String HEADER_TRACE_ID = "X-Trace-Id";

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String traceId = request.getHeader(HEADER_TRACE_ID);
        if (traceId == null || traceId.isBlank()) {
            traceId = UUID.randomUUID().toString();
        }
        MDC.put(MDC_TRACE_ID, traceId);
        response.setHeader(HEADER_TRACE_ID, traceId);
        try {
            chain.doFilter(request, response);
        } finally {
            MDC.remove(MDC_TRACE_ID);
        }
    }
}
