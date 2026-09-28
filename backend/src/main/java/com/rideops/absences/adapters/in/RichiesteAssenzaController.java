package com.rideops.absences.adapters.in;

import com.rideops.absences.application.AnnullaRichiestaAssenzaUseCase;
import com.rideops.absences.application.ApprovaRichiestaAssenzaUseCase;
import com.rideops.absences.application.AssenzaNotFoundException;
import com.rideops.absences.application.AssenzaValidationException;
import com.rideops.absences.application.CreateRichiestaAssenzaUseCase;
import com.rideops.absences.application.DriverAssenzaOptionDto;
import com.rideops.absences.application.GetRichiestaAssenzaUseCase;
import com.rideops.absences.application.InserimentoGestionaleAssenzaUseCase;
import com.rideops.absences.application.ListDriversForAssenzeUseCase;
import com.rideops.absences.application.ListRichiesteAssenzaUseCase;
import com.rideops.absences.application.RichiestaAssenzaDto;
import com.rideops.absences.application.RifiutaRichiestaAssenzaUseCase;
import com.rideops.absences.domain.OrigineRichiestaAssenza;
import com.rideops.absences.domain.StatoRichiestaAssenza;
import com.rideops.identity.application.IdentityUserDetails;
import com.rideops.identity.domain.UserRole;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalTime;
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
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/richieste-assenza")
@PreAuthorize("hasAnyRole('GESTIONALE','DRIVER')")
public class RichiesteAssenzaController {

    private final CreateRichiestaAssenzaUseCase createRichiestaAssenzaUseCase;
    private final InserimentoGestionaleAssenzaUseCase inserimentoGestionaleAssenzaUseCase;
    private final ListRichiesteAssenzaUseCase listRichiesteAssenzaUseCase;
    private final GetRichiestaAssenzaUseCase getRichiestaAssenzaUseCase;
    private final ApprovaRichiestaAssenzaUseCase approvaRichiestaAssenzaUseCase;
    private final RifiutaRichiestaAssenzaUseCase rifiutaRichiestaAssenzaUseCase;
    private final AnnullaRichiestaAssenzaUseCase annullaRichiestaAssenzaUseCase;
    private final ListDriversForAssenzeUseCase listDriversForAssenzeUseCase;

    public RichiesteAssenzaController(CreateRichiestaAssenzaUseCase createRichiestaAssenzaUseCase,
                                      InserimentoGestionaleAssenzaUseCase inserimentoGestionaleAssenzaUseCase,
                                      ListRichiesteAssenzaUseCase listRichiesteAssenzaUseCase,
                                      GetRichiestaAssenzaUseCase getRichiestaAssenzaUseCase,
                                      ApprovaRichiestaAssenzaUseCase approvaRichiestaAssenzaUseCase,
                                      RifiutaRichiestaAssenzaUseCase rifiutaRichiestaAssenzaUseCase,
                                      AnnullaRichiestaAssenzaUseCase annullaRichiestaAssenzaUseCase,
                                      ListDriversForAssenzeUseCase listDriversForAssenzeUseCase) {
        this.createRichiestaAssenzaUseCase = createRichiestaAssenzaUseCase;
        this.inserimentoGestionaleAssenzaUseCase = inserimentoGestionaleAssenzaUseCase;
        this.listRichiesteAssenzaUseCase = listRichiesteAssenzaUseCase;
        this.getRichiestaAssenzaUseCase = getRichiestaAssenzaUseCase;
        this.approvaRichiestaAssenzaUseCase = approvaRichiestaAssenzaUseCase;
        this.rifiutaRichiestaAssenzaUseCase = rifiutaRichiestaAssenzaUseCase;
        this.annullaRichiestaAssenzaUseCase = annullaRichiestaAssenzaUseCase;
        this.listDriversForAssenzeUseCase = listDriversForAssenzeUseCase;
    }

    @PostMapping
    @PreAuthorize("hasRole('DRIVER')")
    @ResponseStatus(HttpStatus.CREATED)
    public RichiestaAssenzaDto creaRichiesta(@Valid @RequestBody CreaRichiestaRequest request,
                                             @AuthenticationPrincipal IdentityUserDetails principal) {
        requireAuthenticated(principal);
        return createRichiestaAssenzaUseCase.execute(
            principal.getId(),
            request.tipoAssenzaId(),
            request.dataInizio(),
            request.dataFine(),
            request.giornataIntera(),
            request.oraInizio(),
            request.oraFine(),
            request.motivazione()
        );
    }

    @PostMapping("/inserimento-gestionale")
    @PreAuthorize("hasRole('GESTIONALE')")
    @ResponseStatus(HttpStatus.CREATED)
    public RichiestaAssenzaDto inserimentoGestionale(@Valid @RequestBody InserimentoGestionaleRequest request,
                                                     @AuthenticationPrincipal IdentityUserDetails principal) {
        requireAuthenticated(principal);
        return inserimentoGestionaleAssenzaUseCase.execute(
            request.driverId(),
            request.tipoAssenzaId(),
            request.dataInizio(),
            request.dataFine(),
            request.giornataIntera(),
            request.oraInizio(),
            request.oraFine(),
            request.motivazione(),
            principal.getId()
        );
    }

    @GetMapping
    public List<RichiestaAssenzaDto> listRichieste(@RequestParam(required = false) Long driverId,
                                                   @RequestParam(required = false) StatoRichiestaAssenza stato,
                                                   @RequestParam(required = false) Long tipoAssenzaId,
                                                   @RequestParam(required = false) OrigineRichiestaAssenza origine,
                                                   @RequestParam(required = false) LocalDate dataInizio,
                                                   @RequestParam(required = false) LocalDate dataFine,
                                                   @AuthenticationPrincipal IdentityUserDetails principal) {
        requireAuthenticated(principal);
        Long driverIdScope = principal.getRole() == UserRole.DRIVER ? principal.getId() : null;
        Long driverIdFilter = driverIdScope != null ? driverIdScope : driverId;
        return listRichiesteAssenzaUseCase.execute(driverIdScope, driverIdFilter, stato, tipoAssenzaId, origine, dataInizio, dataFine);
    }

    @GetMapping("/{id}")
    public RichiestaAssenzaDto getRichiesta(@PathVariable Long id, @AuthenticationPrincipal IdentityUserDetails principal) {
        requireAuthenticated(principal);
        Long driverIdScope = principal.getRole() == UserRole.DRIVER ? principal.getId() : null;
        return getRichiestaAssenzaUseCase.execute(id, driverIdScope);
    }

    @PatchMapping("/{id}/approva")
    @PreAuthorize("hasRole('GESTIONALE')")
    public RichiestaAssenzaDto approva(@PathVariable Long id, @AuthenticationPrincipal IdentityUserDetails principal) {
        requireAuthenticated(principal);
        return approvaRichiestaAssenzaUseCase.execute(id, principal.getId());
    }

    @PatchMapping("/{id}/rifiuta")
    @PreAuthorize("hasRole('GESTIONALE')")
    public RichiestaAssenzaDto rifiuta(@PathVariable Long id,
                                       @Valid @RequestBody RifiutaRequest request,
                                       @AuthenticationPrincipal IdentityUserDetails principal) {
        requireAuthenticated(principal);
        return rifiutaRichiestaAssenzaUseCase.execute(id, request.motivoRifiuto(), principal.getId());
    }

    @PatchMapping("/{id}/annulla")
    public RichiestaAssenzaDto annulla(@PathVariable Long id, @AuthenticationPrincipal IdentityUserDetails principal) {
        requireAuthenticated(principal);
        Long driverIdScope = principal.getRole() == UserRole.DRIVER ? principal.getId() : null;
        return annullaRichiestaAssenzaUseCase.execute(id, driverIdScope);
    }

    @GetMapping("/driver-options")
    @PreAuthorize("hasRole('GESTIONALE')")
    public List<DriverAssenzaOptionDto> listDriverOptions() {
        return listDriversForAssenzeUseCase.execute();
    }

    private void requireAuthenticated(IdentityUserDetails principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Non autorizzato");
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

    record CreaRichiestaRequest(@NotNull Long tipoAssenzaId,
                                @NotNull LocalDate dataInizio,
                                @NotNull LocalDate dataFine,
                                boolean giornataIntera,
                                LocalTime oraInizio,
                                LocalTime oraFine,
                                String motivazione) {
    }

    record InserimentoGestionaleRequest(@NotNull Long driverId,
                                        @NotNull Long tipoAssenzaId,
                                        @NotNull LocalDate dataInizio,
                                        @NotNull LocalDate dataFine,
                                        boolean giornataIntera,
                                        LocalTime oraInizio,
                                        LocalTime oraFine,
                                        String motivazione) {
    }

    record RifiutaRequest(@NotNull String motivoRifiuto) {
    }

    record AssenzeErrorResponse(String message) {
    }
}
