package com.rideops.logging;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.ContextClosedEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

/**
 * Logga gli eventi di ciclo di vita dell'applicazione: avvio e spegnimento.
 *
 * <p>Esempio JSON (avvio):</p>
 * <pre>
 * {"timestamp":"2026-05-05T10:00:00.000Z","level":"INFO","service":"rideops",
 *  "action":"app.start","message":"RideOps avviato","outcome":"success",
 *  "profile":"prod","port":"8080"}
 * </pre>
 */
@Component
public class ApplicationEventLogger {

    private static final Logger log = LoggerFactory.getLogger(ApplicationEventLogger.class);

    private final Environment env;

    public ApplicationEventLogger(Environment env) {
        this.env = env;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onApplicationReady() {
        String port = env.getProperty("server.port", "8080");
        String[] profiles = env.getActiveProfiles();
        String profile = (profiles.length > 0) ? String.join(",", profiles) : "default";
        log.info("action=app.start message=\"RideOps avviato\" profile={} port={} outcome=success",
            profile, port);
    }

    @EventListener(ContextClosedEvent.class)
    public void onContextClosed() {
        log.info("action=app.stop message=\"RideOps in spegnimento\" outcome=success");
    }
}
