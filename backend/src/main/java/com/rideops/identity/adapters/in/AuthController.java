package com.rideops.identity.adapters.in;

import com.rideops.identity.application.IdentityUserDetails;
import com.rideops.identity.application.JwtService;
import com.rideops.identity.application.PasswordResetService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.NotBlank;
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

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final PasswordResetService passwordResetService;

    public AuthController(AuthenticationManager authenticationManager,
                          JwtService jwtService,
                          PasswordResetService passwordResetService) {
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.passwordResetService = passwordResetService;
    }

    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest request) {
        try {
            var authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.userId(), request.password())
            );
            IdentityUserDetails principal = (IdentityUserDetails) authentication.getPrincipal();
            String token = jwtService.generateToken(principal);
            return new LoginResponse(token, "Bearer", jwtService.getExpirationSeconds());
        } catch (BadCredentialsException exception) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }
    }

    @GetMapping("/me")
    public MeResponse me(@AuthenticationPrincipal IdentityUserDetails user) {
        if (user == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Unauthorized");
        }
        return new MeResponse(user.getId(), user.getUserId(), user.getEmail(), user.getRole().name());
    }

    @PostMapping("/forgot-password")
    @ResponseStatus(HttpStatus.OK)
    public GenericMessageResponse forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        passwordResetService.requestReset(request.email());
        return new GenericMessageResponse("If your email exists, you will receive reset instructions.");
    }

    @PostMapping("/reset-password")
    @ResponseStatus(HttpStatus.OK)
    public GenericMessageResponse resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        validatePassword(request.newPassword());
        try {
            passwordResetService.resetPassword(request.token(), request.newPassword());
            return new GenericMessageResponse("Password updated.");
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired token");
        }
    }

    private void validatePassword(String password) {
        if (password.length() < 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Password must be at least 8 characters");
        }
    }

    record LoginRequest(@NotBlank String userId, @NotBlank String password) {
    }

    record LoginResponse(String accessToken, String tokenType, long expiresInSeconds) {
    }

    record MeResponse(Long id, String userId, String email, String role) {
    }

    record ForgotPasswordRequest(@NotBlank @Email String email) {
    }

    record ResetPasswordRequest(@NotBlank String token, @NotNull @NotBlank String newPassword) {
    }

    record GenericMessageResponse(String message) {
    }
}
