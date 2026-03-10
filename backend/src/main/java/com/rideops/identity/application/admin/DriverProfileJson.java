package com.rideops.identity.application.admin;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Collections;
import java.util.List;

final class DriverProfileJson {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private DriverProfileJson() {
    }

    static String writeStringList(List<String> values) {
        if (values == null || values.isEmpty()) {
            return null;
        }
        try {
            return OBJECT_MAPPER.writeValueAsString(values);
        } catch (JsonProcessingException exception) {
            throw new UserAdminValidationException("Invalid driver list format");
        }
    }

    static List<String> readStringList(String json) {
        if (json == null || json.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return OBJECT_MAPPER.readValue(
                json,
                OBJECT_MAPPER.getTypeFactory().constructCollectionType(List.class, String.class)
            );
        } catch (JsonProcessingException exception) {
            return Collections.emptyList();
        }
    }
}
