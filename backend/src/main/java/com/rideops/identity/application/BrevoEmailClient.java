package com.rideops.identity.application;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

@Service
public class BrevoEmailClient {

    private static final Logger LOGGER = LoggerFactory.getLogger(BrevoEmailClient.class);

    private final RestClient restClient;
    private final String apiKey;
    private final String senderEmail;
    private final String senderName;
    private final String replyToEmail;

    public BrevoEmailClient(RestClient.Builder restClientBuilder,
                            @Value("${brevo.base-url:https://api.brevo.com/v3}") String baseUrl,
                            @Value("${brevo.api-key:}") String apiKey,
                            @Value("${brevo.sender-email:}") String senderEmail,
                            @Value("${brevo.sender-name:RideOps}") String senderName,
                            @Value("${brevo.reply-to:support@rideops.it}") String replyToEmail) {
        String normalizedBaseUrl = trimTrailingSlash(defaultIfBlank(baseUrl, "https://api.brevo.com/v3"));
        this.restClient = restClientBuilder
            .baseUrl(Objects.requireNonNull(normalizedBaseUrl))
            .build();
        this.apiKey = defaultIfBlank(apiKey, "");
        this.senderEmail = defaultIfBlank(senderEmail, "");
        this.senderName = defaultIfBlank(senderName, "RideOps");
        this.replyToEmail = defaultIfBlank(replyToEmail, "support@rideops.it");
    }

    public void sendTemplateEmail(Long tenantId,
                                  String recipientEmail,
                                  String recipientName,
                                  int templateId,
                                  Map<String, ?> params) {
        if (apiKey.isBlank() || senderEmail.isBlank()) {
            LOGGER.warn("Brevo disabled for tenantId={} templateId={} (missing api-key or sender-email)", tenantId, templateId);
            return;
        }

        if (recipientEmail == null || recipientEmail.isBlank()) {
            LOGGER.warn("Brevo skipped for tenantId={} templateId={} (missing recipient)", tenantId, templateId);
            return;
        }

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("sender", Map.of("name", senderName, "email", senderEmail));

        Map<String, Object> recipient = new LinkedHashMap<>();
        recipient.put("email", recipientEmail.trim());
        if (recipientName != null && !recipientName.isBlank()) {
            recipient.put("name", recipientName.trim());
        }
        payload.put("to", java.util.List.of(recipient));
        payload.put("replyTo", Map.of("email", replyToEmail));
        payload.put("templateId", templateId);
        payload.put("params", sanitizeParams(params));

        try {
            restClient.post()
                .uri("/smtp/email")
                .contentType(Objects.requireNonNull(MediaType.APPLICATION_JSON))
                .header("api-key", apiKey)
                .body(payload)
                .retrieve()
                .toBodilessEntity();

            LOGGER.info("Brevo email sent tenantId={} templateId={}", tenantId, templateId);
        } catch (RestClientResponseException exception) {
            LOGGER.error(
                "Brevo email failed tenantId={} templateId={} status={} response={}",
                tenantId,
                templateId,
                exception.getStatusCode().value(),
                truncate(exception.getResponseBodyAsString(), 1000)
            );
        } catch (RuntimeException exception) {
            LOGGER.error(
                "Brevo email failed tenantId={} templateId={} reason={}",
                tenantId,
                templateId,
                exception.getMessage()
            );
        }
    }

    private Map<String, Object> sanitizeParams(Map<String, ?> params) {
        Map<String, Object> sanitized = new LinkedHashMap<>();
        if (params == null) {
            return sanitized;
        }

        params.forEach((key, value) -> {
            if (key != null && !key.isBlank()) {
                sanitized.put(key, value == null ? "" : value);
            }
        });
        return sanitized;
    }

    private String defaultIfBlank(String value, String defaultValue) {
        if (value == null || value.isBlank()) {
            return defaultValue;
        }
        return value.trim();
    }

    private String trimTrailingSlash(String value) {
        if (value.endsWith("/")) {
            return value.substring(0, value.length() - 1);
        }
        return value;
    }

    private String truncate(String value, int maxLength) {
        if (value == null) {
            return "";
        }
        if (value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength) + "...";
    }
}