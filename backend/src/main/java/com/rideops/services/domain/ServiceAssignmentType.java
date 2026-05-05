package com.rideops.services.domain;

/**
 * Specifica come un servizio viene gestito/assegnato.
 *
 * <pre>
 * INTERNAL
 *   - Chi acquisisce : Azienda
 *   - Chi esegue     : Azienda (driver interno)
 *   - Partner        : nessuno
 *
 * OUTSOURCED
 *   - Chi acquisisce : Azienda
 *   - Chi esegue     : Partner esecutore (NCC esterno)
 *   - Partner        : partner esecutore (obbligatorio) + pricePartner (obbligatorio)
 *
 * INCOMING
 *   - Chi acquisisce : Partner fornitore (es. agenzia)
 *   - Chi esegue     : Azienda (driver interno)
 *   - Partner        : partner fornitore (obbligatorio)
 *
 * INCOMING_OUTSOURCED
 *   - Chi acquisisce : Partner fornitore (es. agenzia)
 *   - Chi esegue     : Partner esecutore (NCC esterno)
 *   - Partner        : partner fornitore + partner esecutore (entrambi opzionali in modifica)
 * </pre>
 *
 * Transizioni consentite tra tipi in fase di aggiornamento:
 * <pre>
 * INTERNAL            {@literal ->} OUTSOURCED, INCOMING, INCOMING_OUTSOURCED
 * OUTSOURCED          {@literal ->} INTERNAL, INCOMING, INCOMING_OUTSOURCED
 * INCOMING            {@literal ->} INTERNAL, OUTSOURCED, INCOMING_OUTSOURCED
 * INCOMING_OUTSOURCED {@literal ->} INTERNAL, OUTSOURCED, INCOMING
 * </pre>
 */
public enum ServiceAssignmentType {
    INTERNAL,
    OUTSOURCED,
    INCOMING,
    /**
     * Servizio ricevuto da un partner (Agenzia A) e successivamente affidato
     * in esecuzione a un'altra NCC (partner esecutore).
     */
    INCOMING_OUTSOURCED
}
