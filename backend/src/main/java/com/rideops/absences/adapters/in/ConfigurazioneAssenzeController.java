package com.rideops.absences.adapters.in;

import com.rideops.absences.application.AssenzaNotFoundException;
import com.rideops.absences.application.AssenzaValidationException;
import com.rideops.absences.application.ConfigurazioneAssenzaDto;
import com.rideops.absences.application.ConfigurazioneAssenzaInput;
import com.rideops.absences.application.ConfigurazioneAssenzeService;
import com.rideops.absences.application.ConfigurazioneDriverAssenzaDto;
import com.rideops.absences.application.RegoleGeneraliAssenzaDto;
import com.rideops.absences.application.RettificaSaldoDto;
import com.rideops.absences.application.SaldiDriverService;
import com.rideops.identity.application.IdentityUserDetails;
import com.rideops.multitenancy.TenantContext;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/tenant/{tenantId}")
@PreAuthorize("hasRole('GESTIONALE')")
public class ConfigurazioneAssenzeController {

    private final ConfigurazioneAssenzeService configurazioneAssenzeService;
    private final SaldiDriverService saldiDriverService;
    private final TenantContext tenantContext;

    public ConfigurazioneAssenzeController(ConfigurazioneAssenzeService configurazioneAssenzeService,
                                           SaldiDriverService saldiDriverService,
                                           TenantContext tenantContext) {
        this.configurazioneAssenzeService = configurazioneAssenzeService;
        this.saldiDriverService = saldiDriverService;
        this.tenantContext = tenantContext;
    }

    @GetMapping("/configurazione-assenze")
    public List<ConfigurazioneAssenzaDto> list(@PathVariable long tenantId) {
        requireTenant(tenantId);
        return configurazioneAssenzeService.listTenantConfigurations();
    }

    @PatchMapping("/configurazione-assenze/{tipoAssenzaId}")
    public ConfigurazioneAssenzaDto save(@PathVariable long tenantId,
                                         @PathVariable long tipoAssenzaId,
                                         @Valid @RequestBody ConfigurazioneAssenzaInput input,
                                         @AuthenticationPrincipal IdentityUserDetails principal) {
        requireTenant(tenantId);
        return configurazioneAssenzeService.saveTenantConfiguration(tipoAssenzaId, input, principal.getId());
    }

    @DeleteMapping("/configurazione-assenze/{tipoAssenzaId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reset(@PathVariable long tenantId, @PathVariable long tipoAssenzaId) {
        requireTenant(tenantId);
        configurazioneAssenzeService.resetTenantConfiguration(tipoAssenzaId);
    }

    @GetMapping("/regole-generali")
    public RegoleGeneraliAssenzaDto getRules(@PathVariable long tenantId) {
        requireTenant(tenantId);
        return configurazioneAssenzeService.getGeneralRules();
    }

    @PatchMapping("/regole-generali")
    public RegoleGeneraliAssenzaDto saveRules(@PathVariable long tenantId,
                                               @Valid @RequestBody RegoleGeneraliRequest request,
                                               @AuthenticationPrincipal IdentityUserDetails principal) {
        requireTenant(tenantId);
        return configurazioneAssenzeService.saveGeneralRules(request.comportamentoConflittoTurni(), principal.getId());
    }

    @GetMapping("/configurazione-assenze/drivers")
    public List<ConfigurazioneDriverAssenzaDto> listDriverConfigurations(
        @PathVariable long tenantId,
        @RequestParam Long tipoAssenzaId) {
        requireTenant(tenantId);
        return configurazioneAssenzeService.listDriverConfigurations(tipoAssenzaId);
    }

    @GetMapping("/driver/{driverId}/configurazione-assenze/{tipoAssenzaId}")
    public ConfigurazioneDriverAssenzaDto getDriverConfiguration(@PathVariable long tenantId,
                                                                  @PathVariable long driverId,
                                                                  @PathVariable long tipoAssenzaId) {
        requireTenant(tenantId);
        return configurazioneAssenzeService.getDriverConfiguration(driverId, tipoAssenzaId);
    }

    @org.springframework.web.bind.annotation.PutMapping("/driver/{driverId}/configurazione-assenze/{tipoAssenzaId}")
    public ConfigurazioneDriverAssenzaDto saveDriverConfiguration(@PathVariable long tenantId,
                                                                   @PathVariable long driverId,
                                                                   @PathVariable long tipoAssenzaId,
                                                                   @Valid @RequestBody ConfigurazioneAssenzaInput input,
                                                                   @AuthenticationPrincipal IdentityUserDetails principal) {
        requireTenant(tenantId);
        return configurazioneAssenzeService.saveDriverConfiguration(driverId, tipoAssenzaId, input, principal.getId());
    }

    @GetMapping("/driver/{driverId}/saldi/{tipoAssenzaId}/rettifica")
    public RettificaSaldoDto previewSaldoRettifica(@PathVariable long tenantId,
                                                    @PathVariable long driverId,
                                                    @PathVariable long tipoAssenzaId) {
        requireTenant(tenantId);
        return saldiDriverService.previewRettifica(driverId, tipoAssenzaId);
    }

    @PatchMapping("/driver/{driverId}/saldi/{tipoAssenzaId}/rettifica")
    public RettificaSaldoDto rettificaSaldoCorrente(@PathVariable long tenantId,
                                                    @PathVariable long driverId,
                                                    @PathVariable long tipoAssenzaId,
                                                    @AuthenticationPrincipal IdentityUserDetails principal) {
        requireTenant(tenantId);
        return saldiDriverService.rettificaSaldoCorrente(driverId, tipoAssenzaId, principal.getId());
    }

    @DeleteMapping("/driver/{driverId}/configurazione-assenze/{tipoAssenzaId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void resetDriverConfiguration(@PathVariable long tenantId,
                                         @PathVariable long driverId,
                                         @PathVariable long tipoAssenzaId) {
        requireTenant(tenantId);
        configurazioneAssenzeService.resetDriverConfiguration(driverId, tipoAssenzaId);
    }

    private void requireTenant(long requestedTenantId) {
        if (tenantContext.requireTenantId() != requestedTenantId) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Accesso al tenant non consentito");
        }
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

    public record RegoleGeneraliRequest(@NotBlank String comportamentoConflittoTurni) { }
    public record AssenzeErrorResponse(String message) { }
}