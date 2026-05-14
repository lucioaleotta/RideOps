package com.rideops.identity.application;

import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

@Component
public class PasswordPolicy {

    private static final Pattern PASSWORD_PATTERN =
        Pattern.compile("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z\\d]).{8,}$");

    private static final String VALIDATION_MESSAGE =
        "La password deve avere almeno 8 caratteri con maiuscola, minuscola, numero e carattere speciale";

    public boolean isCompliant(String password) {
        return password != null && PASSWORD_PATTERN.matcher(password).matches();
    }

    public String validationMessage() {
        return VALIDATION_MESSAGE;
    }
}