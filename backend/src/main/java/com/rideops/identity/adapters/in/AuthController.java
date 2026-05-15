package com.rideops.identity.adapters.in;

import com.rideops.config.JwtSecurityService;
import com.rideops.identity.application.IdentityUserDetails;
import com.rideops.identity.application.PasswordPolicy;
import com.rideops.identity.application.PasswordResetService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private static final Logger log = LoggerFactory.getLogger(AuthController.class);

    private final AuthenticationManager authenticationManager;
    private final JwtSecurityService jwtSecurityService;
    private final PasswordResetService passwordResetService;
    private final PasswordPolicy passwordPolicy;

    public AuthController(AuthenticationManager authenticationManager,
                          JwtSecurityService jwtSecurityService,
                          PasswordResetService passwordResetService,
                          PasswordPolicy passwordPolicy) {
        this.authenticationManager = authenticationManager;
        this.jwtSecurityService = jwtSecurityService;
        this.passwordResetService = passwordResetService;
        this.passwordPolicy = passwordPolicy;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        try {
            var authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.userId(), request.password())
            );
            IdentityUserDetails principal = (IdentityUserDetails) authentication.getPrincipal();
            String token = jwtSecurityService.generateToken(principal);
            log.info("action=user.login userId={} role={} outcome=success",
                principal.getUserId(), principal.getRole());
            return new LoginResponse(token, "Bearer", jwtSecurityService.getExpirationSeconds());
        } catch (BadCredentialsException exception) {
            // Non loggare il userId (potrebbe contenere email o PII) — solo evento anomalo
            log.warn("action=user.login outcome=failure reason=bad_credentials");
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Credenziali non valide");
        }
    }

    @GetMapping("/me")
    public MeResponse me(@AuthenticationPrincipal IdentityUserDetails user) {
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Non autorizzato");
        }
        return new MeResponse(user.getId(), user.getUserId(), user.getEmail(), user.getRole().name(), user.getTenantId());
    }

    @PostMapping("/forgot-password")
    @ResponseStatus(HttpStatus.OK)
    public GenericMessageResponse forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.requestReset(request.userId());
        return new GenericMessageResponse("Se lo user ID esiste, riceverai le istruzioni per il reset.");
    }

    @PostMapping("/reset-password")
    @ResponseStatus(HttpStatus.OK)
    public GenericMessageResponse resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        validatePassword(request.newPassword());
        try {
            passwordResetService.resetPassword(request.token(), request.newPassword());
            return new GenericMessageResponse("Password aggiornata.");
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Token non valido o scaduto");
        }
    }

    private void validatePassword(String password) {
        if (!passwordPolicy.isCompliant(password)) {
            throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                passwordPolicy.validationMessage()
            );
        }
    }

    record LoginRequest(@NotBlank String userId, @NotBlank String password) {
    }

    record LoginResponse(String accessToken, String tokenType, long expiresInSeconds) {
    }

    record MeResponse(Long id, String userId, String email, String role, Long tenantId) {
    }

    record ForgotPasswordRequest(@NotBlank String userId) {
    }

    record ResetPasswordRequest(@NotBlank String token, @NotNull @NotBlank String newPassword) {
    }

    record GenericMessageResponse(String message) {
    }
}
