package com.rideops.absences.adapters.in;

import com.rideops.absences.application.AssenzaNotFoundException;
import com.rideops.absences.application.AssenzaValidationException;
import com.rideops.absences.application.ConfigurazioneAssenzaInput;
import com.rideops.absences.application.ConfigurazioneAssenzeService;
import com.rideops.absences.application.ConfigurazioneDriverAssenzaDto;
import com.rideops.identity.application.IdentityUserDetails;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/driver/configurazione-assenze/{tipoAssenzaId}")
@PreAuthorize("hasRole('GESTIONALE')")
public class ConfigurazioneAssenzeBulkController {

    private final ConfigurazioneAssenzeService configurazioneAssenzeService;

    public ConfigurazioneAssenzeBulkController(ConfigurazioneAssenzeService configurazioneAssenzeService) {
        this.configurazioneAssenzeService = configurazioneAssenzeService;
    }

    @PutMapping("/bulk-applica")
    public List<ConfigurazioneDriverAssenzaDto> apply(@PathVariable long tipoAssenzaId,
                                                       @Valid @RequestBody BulkApplyRequest request,
                                                       @AuthenticationPrincipal IdentityUserDetails principal) {
        return configurazioneAssenzeService.applyBulk(
            tipoAssenzaId, request.driverIds(), request.configurazione(), principal.getId());
    }

    @DeleteMapping("/bulk-ripristina")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reset(@PathVariable long tipoAssenzaId, @Valid @RequestBody BulkResetRequest request) {
        configurazioneAssenzeService.resetBulk(tipoAssenzaId, request.driverIds());
    }

    @ExceptionHandler(AssenzaValidationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public AssenzeErrorResponse handleValidation(AssenzaValidationException exception) {
        return new AssenzeErrorResponse(exception.getMessage());
    }

    @ExceptionHandler(AssenzaNotFoundException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public AssenzeErrorResponse handleNotFound(AssenzaNotFoundException exception) {
        return new AssenzeErrorResponse(exception.getMessage());
    }

    public record BulkApplyRequest(@NotEmpty @Size(max = 100) List<@NotNull Long> driverIds,
                                   @NotNull @Valid ConfigurazioneAssenzaInput configurazione) { }
    public record BulkResetRequest(@NotEmpty @Size(max = 100) List<@NotNull Long> driverIds) { }
    public record AssenzeErrorResponse(String message) { }
}