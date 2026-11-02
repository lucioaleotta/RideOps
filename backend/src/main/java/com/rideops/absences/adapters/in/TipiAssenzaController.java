package com.rideops.absences.adapters.in;

import com.rideops.absences.application.AssenzaNotFoundException;
import com.rideops.absences.application.AssenzaValidationException;
import com.rideops.absences.application.AggiornaTipoAssenzaInput;
import com.rideops.absences.application.AuditTipoAssenzaDto;
import com.rideops.absences.application.CreaTipoAssenzaInput;
import com.rideops.absences.application.GestioneTipiAssenzaAdminService;
import com.rideops.absences.application.ListTipiAssenzaUseCase;
import com.rideops.absences.application.TipoAssenzaDto;
import com.rideops.identity.application.IdentityUserDetails;
import com.rideops.identity.domain.UserRole;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tipi-assenza")
@PreAuthorize("hasAnyRole('ADMIN','GESTIONALE','DRIVER')")
public class TipiAssenzaController {

    private final ListTipiAssenzaUseCase listTipiAssenzaUseCase;
    private final GestioneTipiAssenzaAdminService gestioneAdminService;

    public TipiAssenzaController(ListTipiAssenzaUseCase listTipiAssenzaUseCase,
                                 GestioneTipiAssenzaAdminService gestioneAdminService) {
        this.listTipiAssenzaUseCase = listTipiAssenzaUseCase;
        this.gestioneAdminService = gestioneAdminService;
    }

    @GetMapping
    public List<TipoAssenzaDto> listTipiAssenza(@AuthenticationPrincipal IdentityUserDetails principal) {
        if (principal != null && principal.getRole() == UserRole.ADMIN) {
            return gestioneAdminService.listAll();
        }
        return listTipiAssenzaUseCase.execute();
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    @org.springframework.web.bind.annotation.ResponseStatus(HttpStatus.CREATED)
    public TipoAssenzaDto create(@Valid @RequestBody CreaTipoAssenzaInput input,
                                 @AuthenticationPrincipal IdentityUserDetails principal) {
        return gestioneAdminService.create(input, principal.getId());
    }

    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public TipoAssenzaDto update(@PathVariable long id,
                                 @Valid @RequestBody AggiornaTipoAssenzaInput input,
                                 @AuthenticationPrincipal IdentityUserDetails principal) {
        return gestioneAdminService.update(id, input, principal.getId());
    }

    @PatchMapping("/{id}/disattiva")
    @PreAuthorize("hasRole('ADMIN')")
    public TipoAssenzaDto deactivate(@PathVariable long id,
                                     @AuthenticationPrincipal IdentityUserDetails principal) {
        return gestioneAdminService.deactivate(id, principal.getId());
    }

    @GetMapping("/audit")
    @PreAuthorize("hasRole('ADMIN')")
    public List<AuditTipoAssenzaDto> audit() {
        return gestioneAdminService.listAudit();
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

    record AssenzeErrorResponse(String message) {
    }
}
