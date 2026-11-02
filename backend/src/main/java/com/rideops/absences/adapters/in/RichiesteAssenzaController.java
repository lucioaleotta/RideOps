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
import org.springframework.lang.NonNull;
import org.springframework.lang.Nullable;
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
        IdentityUserDetails user = requireAuthenticated(principal);
        return createRichiestaAssenzaUseCase.execute(
            requireUserId(user),
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
        IdentityUserDetails user = requireAuthenticated(principal);
        return inserimentoGestionaleAssenzaUseCase.execute(
            request.driverId(),
            request.tipoAssenzaId(),
            request.dataInizio(),
            request.dataFine(),
            request.giornataIntera(),
            request.oraInizio(),
            request.oraFine(),
            request.motivazione(),
            requireUserId(user)
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
        IdentityUserDetails user = requireAuthenticated(principal);
        Long driverIdScope = user.getRole() == UserRole.DRIVER ? requireUserId(user) : null;
        Long driverIdFilter = driverIdScope != null ? driverIdScope : driverId;
        boolean includeTurnConflicts = user.getRole() == UserRole.GESTIONALE;
        return listRichiesteAssenzaUseCase.execute(
            driverIdScope, driverIdFilter, stato, tipoAssenzaId, origine, dataInizio, dataFine, includeTurnConflicts);
    }

    @GetMapping("/pending-count")
    @PreAuthorize("hasRole('GESTIONALE')")
    public PendingCountResponse countPending() {
        return new PendingCountResponse(listRichiesteAssenzaUseCase.countPendingForTenant());
    }

    @GetMapping("/{id}")
    public RichiestaAssenzaDto getRichiesta(@PathVariable long id, @AuthenticationPrincipal IdentityUserDetails principal) {
        IdentityUserDetails user = requireAuthenticated(principal);
        Long driverIdScope = user.getRole() == UserRole.DRIVER ? requireUserId(user) : null;
        return getRichiestaAssenzaUseCase.execute(id, driverIdScope);
    }

    @PatchMapping("/{id}/approva")
    @PreAuthorize("hasRole('GESTIONALE')")
    public RichiestaAssenzaDto approva(@PathVariable long id, @AuthenticationPrincipal IdentityUserDetails principal) {
        IdentityUserDetails user = requireAuthenticated(principal);
        return approvaRichiestaAssenzaUseCase.execute(id, requireUserId(user));
    }

    @PatchMapping("/{id}/rifiuta")
    @PreAuthorize("hasRole('GESTIONALE')")
    public RichiestaAssenzaDto rifiuta(@PathVariable long id,
                                       @Valid @RequestBody RifiutaRequest request,
                                       @AuthenticationPrincipal IdentityUserDetails principal) {
        IdentityUserDetails user = requireAuthenticated(principal);
        return rifiutaRichiestaAssenzaUseCase.execute(id, request.motivoRifiuto(), requireUserId(user));
    }

    @PatchMapping("/{id}/annulla")
    public RichiestaAssenzaDto annulla(@PathVariable long id, @AuthenticationPrincipal IdentityUserDetails principal) {
        IdentityUserDetails user = requireAuthenticated(principal);
        Long driverIdScope = user.getRole() == UserRole.DRIVER ? requireUserId(user) : null;
        return annullaRichiestaAssenzaUseCase.execute(id, driverIdScope);
    }

    @GetMapping("/driver-options")
    @PreAuthorize("hasRole('GESTIONALE')")
    public List<DriverAssenzaOptionDto> listDriverOptions() {
        return listDriversForAssenzeUseCase.execute();
    }

    private IdentityUserDetails requireAuthenticated(@Nullable IdentityUserDetails principal) {
        if (principal == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Non autorizzato");
        }
        return principal;
    }

    private long requireUserId(IdentityUserDetails principal) {
        if (principal.getId() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Identificativo utente non disponibile");
        }
        return principal.getId().longValue();
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

    record CreaRichiestaRequest(@NonNull @NotNull Long tipoAssenzaId,
                                @NonNull @NotNull LocalDate dataInizio,
                                @NonNull @NotNull LocalDate dataFine,
                                boolean giornataIntera,
                                LocalTime oraInizio,
                                LocalTime oraFine,
                                String motivazione) {
    }

    record InserimentoGestionaleRequest(@NonNull @NotNull Long driverId,
                                        @NonNull @NotNull Long tipoAssenzaId,
                                        @NonNull @NotNull LocalDate dataInizio,
                                        @NonNull @NotNull LocalDate dataFine,
                                        boolean giornataIntera,
                                        LocalTime oraInizio,
                                        LocalTime oraFine,
                                        String motivazione) {
    }

    record RifiutaRequest(@NotNull String motivoRifiuto) {
    }

    record AssenzeErrorResponse(String message) {
    }

    record PendingCountResponse(long count) { }
}
