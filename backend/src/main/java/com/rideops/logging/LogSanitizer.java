package com.rideops.logging;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Sanitizzazione centralizzata PCI DSS per i log.
 *
 * <p>Applica {@link #sanitize(String)} su ogni valore controllato dall'utente
 * o contenente dati di business prima di scriverlo nei log. Non delegare
 * l'offuscamento ai singoli sviluppatori: usa sempre questa classe.</p>
 *
 * <p>Regole applicate:</p>
 * <ul>
 *   <li>Numeri carta/PAN → {@code ****-****-****-1234} (ultime 4 cifre)</li>
 *   <li>CVV/CVC         → {@code ****}</li>
 *   <li>IBAN            → {@code ****1234} (ultime 4 cifre)</li>
 *   <li>Password/token/secret/chiavi → {@code [REDACTED]}</li>
 *   <li>Email           → {@code m***@dominio.com}</li>
 *   <li>Telefono        → {@code ****567} (ultime 3 cifre)</li>
 * </ul>
 */
public final class LogSanitizer {

    // ── Pattern PCI ────────────────────────────────────────────────────────
    /** Numeri carta: 13-19 cifre (con eventuali spazi o trattini separatori). */
    private static final Pattern CARD_NUMBER = Pattern.compile(
        "\\b(\\d[ \\-]?){12,18}\\d\\b");

    /** IBAN: IT/EU standard. */
    private static final Pattern IBAN = Pattern.compile(
        "\\b[A-Z]{2}\\d{2}[A-Z0-9]{4}\\d{7}[A-Z0-9]{0,16}\\b");

    /** Campi sensibili in formato key=value / key: value / key="value". */
    private static final Pattern SENSITIVE_FIELD = Pattern.compile(
        "(?i)(password|token|secret|api[_-]?key|authorization|cvv|cvc|x-auth)"
            + "(\\s*[=:\\s\"']+\\s*)([^\\s\"',;{}\\[\\]]+)");

    // ── Pattern PII ────────────────────────────────────────────────────────
    /** Email: conserva solo il primo carattere della local-part. */
    private static final Pattern EMAIL = Pattern.compile(
        "\\b([a-zA-Z0-9._%+\\-])[a-zA-Z0-9._%+\\-]*(@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,})\\b");

    /**
     * Telefono: sequenza di almeno 7 cifre (con prefissi/separatori opzionali).
     * Conserva solo le ultime 3 cifre.
     */
    private static final Pattern PHONE = Pattern.compile(
        "(?<![\\d])(\\+?[\\d][\\d .\\-()]{4,}[\\d])(?![\\d])");

    // ──────────────────────────────────────────────────────────────────────
    private LogSanitizer() {}

    /**
     * Sanitizza {@code message} applicando tutte le regole PCI DSS e PII.
     * Se {@code message} è {@code null} restituisce {@code null}.
     */
    public static String sanitize(String message) {
        if (message == null) {
            return null;
        }
        String s = message;
        s = sanitizeSensitiveFields(s);
        s = sanitizeCardNumbers(s);
        s = sanitizeIban(s);
        s = sanitizeEmail(s);
        s = sanitizePhone(s);
        return s;
    }

    // ── Implementazioni private ────────────────────────────────────────────

    private static String sanitizeSensitiveFields(String s) {
        return SENSITIVE_FIELD.matcher(s).replaceAll("$1$2[REDACTED]");
    }

    private static String sanitizeCardNumbers(String s) {
        Matcher m = CARD_NUMBER.matcher(s);
        StringBuffer sb = new StringBuffer();
        while (m.find()) {
            String digits = m.group().replaceAll("[^\\d]", "");
            String last4 = digits.substring(Math.max(0, digits.length() - 4));
            m.appendReplacement(sb, "****-****-****-" + last4);
        }
        m.appendTail(sb);
        return sb.toString();
    }

    private static String sanitizeIban(String s) {
        Matcher m = IBAN.matcher(s);
        StringBuffer sb = new StringBuffer();
        while (m.find()) {
            String iban = m.group();
            String last4 = iban.substring(Math.max(0, iban.length() - 4));
            m.appendReplacement(sb, "****" + last4);
        }
        m.appendTail(sb);
        return sb.toString();
    }

    private static String sanitizeEmail(String s) {
        // conserva: primo char + *** + @dominio
        return EMAIL.matcher(s).replaceAll("$1***$2");
    }

    private static String sanitizePhone(String s) {
        Matcher m = PHONE.matcher(s);
        StringBuffer sb = new StringBuffer();
        while (m.find()) {
            String digits = m.group().replaceAll("[^\\d]", "");
            if (digits.length() < 7) {
                m.appendReplacement(sb, m.group()); // troppo corto, lascia stare
                continue;
            }
            String last3 = digits.substring(digits.length() - 3);
            m.appendReplacement(sb, "****" + last3);
        }
        m.appendTail(sb);
        return sb.toString();
    }
}
